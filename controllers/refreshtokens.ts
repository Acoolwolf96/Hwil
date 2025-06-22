import {Request, Response} from 'express';
import {verifyRefreshToken, generateAccessToken, parseTimeToSeconds} from '../utils/jwt';
import { cookieConfig } from '../utils/cookies';

export const refreshAccessToken = async (req: Request, res: Response) => {

    console.log('Refresh token endpoint hit');
    console.log('Cookies:', req.cookies);
    console.log('Headers:', req.headers.cookie);

    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        console.error('No refresh token in cookies');
        res.status(400).json({ message: 'Missing refresh token' });
        return
    }

    try {
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

        res.status(200).json({ message: 'Token refreshed' });
        return;
    } catch (err) {
        console.error('Refresh token error:', err);
        res.status(403).json({ message: 'Invalid refresh token' });
        return;
    }
};