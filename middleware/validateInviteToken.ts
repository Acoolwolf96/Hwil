import { Request, Response, NextFunction } from 'express';
import  { InviteToken } from '../models/InviteToken';


export const validateInviteToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { token, email } = req.body;

    if (!token || !email) {
        res.status(400).json({ message: 'Token and email are required' });
        return;
    }

    const inviteToken = await InviteToken.findOne({ token, email });

    if (!inviteToken || inviteToken.expiresAt < new Date()) {
        // Token is either invalid or expired
        res.status(400).json({ message: 'Invalid or expired token' });
        return;
    }

    req.body.organizationId = inviteToken.organizationId;
    next();
};  