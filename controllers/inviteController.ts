import { Request, Response } from 'express';
import crypto from 'crypto';
import { InviteToken } from '../models/InviteToken';
import { sendEmail } from '../utils/email';
import { Organization } from '../models/Organization';

export const sendInvite = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (user.role !== 'manager') {
            res.status(403).json({ message: 'Only managers can invite staff' });
            return;
        }

        const { email, name } = req.body;

        if (!email || typeof email !== 'string' || !name || typeof name !== 'string') {
            res.status(400).json({ message: 'Both name and email are required and must be strings' });
            return;
        }

        const token = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Save token to DB
        await InviteToken.create({
            email,
            token,
            organizationId: user.organizationId,
            expiresAt,
        });

        // Get organization name for email
        const org = await Organization.findById(user.organizationId);
        const organizationName = org?.name || 'Hwil';

        // Construct invite link
        const inviteLink = `${process.env.FRONTEND_URL}/register/staff?token=${token}`;

        // Send email
        await sendEmail({
            to: email,
            subject: 'You have been invited to join Hwil',
            template: 'invite_staff',
            context: {
                username: name,
                Organization: organizationName,
                inviteLink,
            },
        });

        res.status(200).json({ message: 'Invite sent successfully' });
    } catch (error) {
        console.error('Error sending invite:', error);
        res.status(500).json({ message: 'Error sending invite' });
    }
};
