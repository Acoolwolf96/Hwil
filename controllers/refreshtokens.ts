import { Request, Response } from 'express';
import { verifyRefreshToken, generateAccessToken } from '../utils/jwt';

export const refreshAccessToken = (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Missing refresh token' });
    }

    try {
        const user = verifyRefreshToken(refreshToken);
        const newAccessToken = generateAccessToken({
            id: user.id, email: user.email,
            role: '',
            organizationId: ''
        });

        return res.json({ accessToken: newAccessToken });
    } catch (err) {
        return res.status(403).json({ message: 'Invalid refresh token' });
    }
};
