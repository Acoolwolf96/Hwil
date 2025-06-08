import { Request, Response, NextFunction } from "express";
import { generateAccessToken, verifyAccessToken, verifyRefreshToken } from "../utils/jwt";
import revokedToken from "../models/revokedToken";



export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const refreshToken = req.cookies?.refreshToken;

    // Check for Bearer token
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
                res.setHeader("Authorization", newAccessToken);
                req.user = payload;

                next();
                return;
            } catch (refreshError: any){
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
