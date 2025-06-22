import {Request, Response} from 'express';
import {verifyRefreshToken, generateAccessToken, parseTimeToSeconds} from '../utils/jwt';
import { cookieConfig } from '../utils/cookies';
import cookie from "cookie";


export const refreshAccessToken = async (req: Request, res: Response) => {
    console.log('Refresh token endpoint hit');
    console.log('Cookies:', req.cookies);
    console.log('Headers:', req.headers.cookie);

    // Try multiple sources for the refresh token
    let refreshToken = req.cookies?.refreshToken;

    // If not in parsed cookies, try parsing from header
    if (!refreshToken && req.headers.cookie) {
        try {
            const parsedCookies = cookie.parse(req.headers.cookie);
            refreshToken = parsedCookies.refreshToken;
        } catch (error) {
            console.error('Error parsing cookie header:', error);
        }
    }

    if (!refreshToken) {
        console.error('No refresh token found in any source');
        res.status(400).json({ message: 'Missing refresh token' });
        return;
    }

    try {
        console.log('Verifying refresh token...');
        const user = verifyRefreshToken(refreshToken);
        const newAccessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId
        });

        res.cookie('accessToken', newAccessToken, {
            ...cookieConfig,
            maxAge: parseTimeToSeconds(process.env.JWT_ACCESS_EXPIRES) * 1000,
        });

        // Also set the refresh token again to ensure it persists
        res.cookie('refreshToken', refreshToken, {
            ...cookieConfig,
            maxAge: parseTimeToSeconds(process.env.JWT_REFRESH_EXPIRES) * 1000,
        });

        res.status(200).json({ message: 'Token refreshed' });
        return;
    } catch (err) {
        console.error('Refresh token error:', err);
        res.status(403).json({ message: 'Invalid refresh token' });
        return;
    }
};