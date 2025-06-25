import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import {generateAccessToken, generateRefreshToken, parseTimeToSeconds} from '../utils/jwt';
import { sendEmail } from '../utils/email';
import { Staff } from '../models/Staff';
import { InviteToken } from '../models/InviteToken';
import { Invite } from '../models/Invites';
import { PasswordResetToken } from '../models/PasswordResetToken';


const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');

// POST /auth/register – Manager onboarding
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, organizationName } = req.body;

        if (!name || !email || !password || !organizationName) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const normalizedEmail = email.toLowerCase();

        // Check if email already exists (case-insensitive)
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            res.status(409).json({ error: 'User already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = new User({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'manager',
        });

        const savedUser = await user.save();

        const organization = new Organization({
            name: organizationName,
            createdBy: savedUser._id,
        });

        const savedOrg = await organization.save();

        savedUser.organizationId = savedOrg._id as import('mongoose').Types.ObjectId;
        await savedUser.save();

        const payload = {
            id: (savedUser._id as import('mongoose').Types.ObjectId).toString(),
            email: savedUser.email,
            role: savedUser.role,
            organizationId: (savedOrg._id as import('mongoose').Types.ObjectId).toString(),
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
            message: 'Manager and organization created',
            accessToken,
            organizationId: savedOrg._id,
        });

        try {
            await sendEmail({
                to: normalizedEmail,
                subject: 'Welcome to our System',
                template: 'welcome_email',
                context: { username: name },
            });
        } catch (emailErr) {
            console.error('Email sending failed:', emailErr);
        }
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
};


// POST /auth/login – Authenticate user
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Check in both User and Staff collections
        const user = await User.findOne({ email });
        const staff = await Staff.findOne({ email });

        const account = user || staff;

        if (!account || !(await bcrypt.compare(password, account.password))) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        if (!account.organizationId) {
            res.status(401).json({ message: 'Account not linked to any organization' });
            return;
        }

        const payload = {
            id: account.id.toString(),
            email: account.email,
            role: account.role,
            organizationId: account.organizationId.toString(),
            ...(staff && { managerId: staff.managerId.toString() }),
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: parseTimeToSeconds(process.env.JWT_REFRESH_EXPIRES) * 1000, // Convert to milliseconds
            path: '/'
        });

        res.status(200).json({
            user: {
                id: account.id.toString(),
                name: account.name,
                email: account.email,
                role: account.role,
            },
            message: "Logged in Successfully",
            accessToken,
            refreshToken,
            organizationId: account.organizationId,
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};


export const registerStaffWithToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.query;
        const { name, password } = req.body;

        if (!token || typeof token !== 'string') {
            res.status(400).json({ message: 'Invalid or missing token' });
            return;
        }

        if (!name || !password) {
            res.status(400).json({ message: 'Name and password are required' });
            return;
        }

        const invite = await InviteToken.findOneAndDelete({ token });

        if (!invite) {
            res.status(400).json({ message: 'Invalid invite token' });
            return;
        }

        if (invite.expiresAt < new Date()) {
            res.status(400).json({ message: 'Invite token has expired' });
            return;
        }

        const existingUser = await User.findOne({ email: invite.email });
        if (existingUser) {
            res.status(409).json({ message: 'User already exists with this email' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const staff = new Staff({
            name,
            email: invite.email,
            password: hashedPassword,
            role: 'staff',
            organizationId: invite.organizationId,
            managerId: invite.createdBy,
        });

        await staff.save();

        // Update the invite status
        await Invite.updateOne(
            { email: invite.email },
            { $set: { stage: 'accepted' } }
        );

        const payload = {
            id: (staff.id as import('mongoose').Types.ObjectId).toString(),
            email: staff.email,
            role: 'staff',
            organizationId: (staff.organizationId as import('mongoose').Types.ObjectId).toString(),
            managerId: (staff.managerId as import('mongoose').Types.ObjectId).toString(),
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // Set tokens as HTTP-only cookies
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: parseTimeToSeconds(process.env.JWT_REFRESH_EXPIRES) * 1000,
        });

        const org = await Organization.findById(invite.organizationId);
        const organizationName = org?.name || 'Hwil';

        res.status(201).json({
            message: 'Staff registered successfully',
            user: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                role: staff.role
            },
            organizationId: invite.organizationId,
            organizationName,
        });


        try {
            await sendEmail({
                to: staff.email,
                subject: 'Welcome to our System',
                template: 'staff_registration_success',
                context: {
                    username: staff.name,
                    Organization: organizationName,
                },
            });
        } catch (emailErr) {
            console.error('Email sending failed:', emailErr);
        }

    } catch (error) {
        console.error('Error registering staff with token:', error);
        res.status(500).json({ message: 'Error registering staff' });
    }
}


export const getAllStaffInOrg = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    // Add null check for req.user
    if (!user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { organizationId } = req.user; // Now safe to destructure

    const staffList = await Staff.find({ organizationId }).select('_id name email');
    res.status(200).json(staffList);
  } catch (error) {
    console.error('Failed to get staff list:', error);
    res.status(500).json({ message: 'Failed to get staff list' });
  }
};


export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            res.status(400).json({ message: 'Email is required' });
            return;
        }

        const normalizedEmail = email.toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });
        const staff = await Staff.findOne({ email: normalizedEmail });
        const account = user || staff;

        console.log('Account found:', account);

        if (!account) {
            res.status(200).json({ message: 'If the email exists, a reset link has been sent' });
            return;
        }

        const resetToken = crypto.randomBytes(16).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await PasswordResetToken.create({
            userId: account._id,
            token: hashedToken,
            email: account.email,
            expiresAt,
        });

        const resetUrl = `${process.env.FRONTEND_URL}/v4/reset-password?token=${resetToken}`;

        await sendEmail({
            to: account.email,
            subject: 'Password Reset Request',
            template: 'reset_password',
            context: {
                username: account.name || account.email,
                resetLink: resetUrl,
            },
        });

        res.status(200).json({ message: 'Password reset link sent to your email' });
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'Error sending password reset email' });
    }
};



export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            res.status(400).json({ message: 'Token and password are required' });
            return;
        }

        // Hash the token to compare with stored token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find valid token
        const resetToken = await PasswordResetToken.findOne({
            token: hashedToken,
            expiresAt: { $gt: new Date() },
        });

        if (!resetToken) {
            res.status(400).json({ message: 'Invalid or expired reset token' });
            return;
        }

        // Find user
        const user = await User.findById(resetToken.userId);
        
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Update user password
        user.password = hashedPassword;
        await user.save();

        // Delete the used token
        await PasswordResetToken.deleteOne({ _id: resetToken._id });

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
};

export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            res.status(400).json({ message: 'Token is required' });
            return;
        }

        // Hash the token to compare with stored token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Check if token exists and is valid
        const resetToken = await PasswordResetToken.findOne({
            token: hashedToken,
            expiresAt: { $gt: new Date() },
        });

        if (!resetToken) {
            res.status(400).json({ message: 'Invalid or expired reset token' });
            return;
        }

        res.status(200).json({ message: 'Token is valid', email: resetToken.email });
    } catch (error) {
        console.error('Error validating reset token:', error);
        res.status(500).json({ message: 'Error validating token' });
    }
};









// POST /auth/logout – Logout user
export const logout = async (req: Request, res: Response) => {
    try {
        // Clear both cookies
        res.clearCookie('accessToken');

        res.clearCookie('refreshToken');

        res.status(200).json({ message: 'Logged out successfully' });
        return;
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Logout failed' });
        return;
    }
};