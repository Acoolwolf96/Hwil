import { Request, Response, NextFunction } from "express";
import {generateAccessToken, verifyAccessToken, verifyRefreshToken} from "../utils/jwt";
import revokedToken from "../models/revokedToken";
import { cookieConfig } from '../utils/cookies';

/**
 * Middleware to authenticate users using JWT tokens.
 * * It checks for the presence of an access token in the Authorization header.
 * * If the access token is missing or invalid, it checks for a refresh token in cookies.
 * * If the refresh token is valid, it generates a new access token and sets it in the response header.
 * * If both tokens are invalid, it sends a 401 Unauthorized response.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 * @returns A promise that resolves when the middleware is done.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const refreshToken = req.cookies?.refreshToken;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({message: 'Access token missing'});
        return
    }

    const accessToken = authHeader.split(' ')[1];

    try {
        req.user = verifyAccessToken(accessToken);
        next();
        return;
    } catch (err: any) {
        if (err.name === 'TokenExpiredError' && refreshToken) {
            try {
                const payload = verifyRefreshToken(refreshToken);
                if (await isTokenRevoked(payload.jti)) {
                    res.status(403).json({message: 'Refresh token revoked'});
                    return;
                }
                const newAccessToken = generateAccessToken(payload);
                res.setHeader('accessToken', newAccessToken);

                req.user = payload;
                next();
                return;
            } catch (refreshErr) {
                res.status(403).json({message: 'Invalid refresh token'});
                return;
            }
        }

        res.status(401).json({message: 'Unauthorized'});
    }
};

async function isTokenRevoked(jti: string): Promise<boolean> {
    try {
        const revoked = await revokedToken.findOne({ jti });
        return !!revoked;
    } catch (error) {
        console.error('Error checking revoked token:', error);
        return false;
    }
}