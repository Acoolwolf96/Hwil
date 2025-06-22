import { Request, Response, NextFunction } from "express";
import { generateAccessToken, verifyAccessToken, verifyRefreshToken } from "../utils/jwt";
import revokedToken from "../models/revokedToken";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get token from cookie first, then check Authorization header as fallback
    let accessToken = req.cookies?.accessToken;

    // If no cookie, check Authorization header (but don't expose it in response)
    if (!accessToken) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            accessToken = authHeader.substring(7);
        }
    }

    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken) {
        res.status(401).json({ message: "Unauthorized - Access token missing" });
        return;
    }

    try {
        req.user = verifyAccessToken(accessToken);
        return next();
    } catch (error: any) {
        console.log('Access token verification error:', error.name);

        if (error.name === "TokenExpiredError" && refreshToken) {
            try {
                console.log('Attempting to refresh token...');
                const payload = verifyRefreshToken(refreshToken);

                // Check if refresh token is revoked
                if (await isTokenRevoked(payload.jti)) {
                    console.log('Refresh token is revoked');
                    res.status(403).json({ message: "Refresh token revoked" });
                    return;
                }

                const newAccessToken = generateAccessToken({
                    id: payload.id,
                    email: payload.email,
                    role: payload.role,
                    organizationId: payload.organizationId
                });

                console.log('New access token generated');

                // Set the new token in a custom header
                res.setHeader('X-New-Token', newAccessToken);

                // Also set it as an HTTP-only cookie
                res.cookie("accessToken", newAccessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
                    maxAge: 15 * 60 * 1000, // 15 minutes
                    path: '/'
                });

                req.user = payload;
                return next();
            } catch (refreshError: any) {
                console.error('Refresh token error:', refreshError.name, refreshError.message);
                res.status(403).json({ message: "Invalid refresh token" });
                return;
            }
        }

        if (error.name === "JsonWebTokenError") {
            res.status(401).json({ message: "Invalid token" });
            return;
        }

        res.status(401).json({ message: "Unauthorized" });
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