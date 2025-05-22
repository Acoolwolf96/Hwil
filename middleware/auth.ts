import { Request, Response, NextFunction } from "express";
import { generateAccessToken, verifyAccessToken, verifyRefreshToken } from "../utils/jwt";
import revokedToken from "../models/revokedToken";

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            user?: any; 
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const refreshToken = req.cookies?.refreshToken;

    // Check for Bearer token
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized - No token provided" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        // First check if token is revoked
        const decoded = verifyAccessToken(token);
        if (await isTokenRevoked(decoded.jti)) {
            res.status(403).json({ message: "Token revoked" });
            return;
        }

        req.user = decoded;
        next();
        return;
    } catch (error: any) {
        // Handle expired token with refresh token
        if (error.name === "TokenExpiredError" && refreshToken) {
            try {
                const payload = verifyRefreshToken(refreshToken);
                
                // Check if refresh token is revoked
                if (await isTokenRevoked(payload.jti)) {
                    res.status(403).json({ message: "Refresh token revoked" });
                    return;
                }

                // Generate new access token
                const newAccessToken = generateAccessToken(payload);

                // Set new token in header and response locals
                res.setHeader("Authorization", `Bearer ${newAccessToken}`);
                res.locals.newAccessToken = newAccessToken;
                req.user = payload;

                next();
                return;
            } catch {
                res.status(403).json({ message: "Invalid refresh token" });
                return;
            }
        }

        // Handle other JWT errors
        if (error.name === "JsonWebTokenError") {
            res.status(401).json({ message: "Invalid token" });
            return;
        }

        res.status(401).json({ message: "Unauthorized" });
        return;
    }
};

async function isTokenRevoked(jti: string): Promise<boolean> {
    const revoked = await revokedToken.findOne({ jti });
    return !!revoked;
}
