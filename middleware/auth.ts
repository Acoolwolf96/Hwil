import { Request, Response, NextFunction } from "express";
import { generateAccessToken, verifyAccessToken, verifyRefreshToken } from "../utils/jwt";
import revokedToken from "../models/revokedToken";



export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const refreshToken = req.cookies?.refreshToken;

    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized - Token missing" });
        return;
    }

    const accessToken = authHeader.split(" ")[1];

    try {
        req.user = verifyAccessToken(accessToken);
        next();
        return;
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

                // Generate new access token using the same structure as your JWT utility expects
                const newAccessToken = generateAccessToken({
                    id: payload.id,
                    email: payload.email,
                    role: payload.role,
                    organizationId: payload.organizationId
                });

                console.log('New access token generated');

                // Send new token in response header
                res.setHeader("X-New-Token", newAccessToken);
                res.setHeader("Access-Control-Expose-Headers", "X-New-Token");

                // Set req.user with the payload
                req.user = payload;

                next();
                return;
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
        // debugging
        console.log('Refresh token present:', !!refreshToken);
        console.log('Cookies:', req.cookies);

        res.status(401).json({ message: "Unauthorized" });
        return;
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