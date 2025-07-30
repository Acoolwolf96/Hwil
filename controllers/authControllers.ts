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
import { generateVerificationToken, createVerificationUrl } from "../utils/emailVerification";
import {EmailVerificationToken} from "../models/EmailVerificationToken";
import { Shift } from "../models/Shift";
import {notifyManagerWelcome} from "../services/notificationService";


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
            emailVerified: false
        });

        const savedUser = await user.save();

        const organization = new Organization({
            name: organizationName,
            createdBy: savedUser._id,
        });

        const savedOrg = await organization.save();

        savedUser.organizationId = savedOrg._id as import('mongoose').Types.ObjectId;
        await savedUser.save();

        // Send welcome email first
        try {
            await sendEmail({
                to: normalizedEmail,
                subject: 'Welcome to Hwil',
                template: 'welcome_email',
                context: {
                    username: name,
                    organizationName: organizationName
                },
            });
            await notifyManagerWelcome(
                savedUser.id.toString(),
                normalizedEmail,
                name,
                organizationName
            )
        } catch (emailErr) {
            console.error('Welcome email sending failed:', emailErr);
        }

        // Generate verification token and send verification email
        try {
            const verificationToken = await generateVerificationToken(
                savedUser.id.toString(),
                savedUser.email
            );
            const verificationUrl = createVerificationUrl(verificationToken);

            await sendEmail({
                to: normalizedEmail,
                subject: 'Verify Your Email - Hwil',
                template: 'verify_email',
                context: {
                    username: name,
                    verificationLink: verificationUrl
                },
            });
        } catch (emailErr) {
            console.error('Verification email sending failed:', emailErr);
        }

        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.',
            requiresEmailVerification: true,
            organizationId: savedOrg._id,
        });

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
            emailVerified: false
        });

        await staff.save();

        // Update the invite status
        await Invite.updateOne(
            { email: invite.email },
            { $set: { stage: 'accepted' } }
        );

        const org = await Organization.findById(invite.organizationId);
        const organizationName = org?.name || 'Hwil';

        // Send welcome email first
        try {
            await sendEmail({
                to: staff.email,
                subject: 'Welcome to Hwil',
                template: 'staff_registration_success',
                context: {
                    username: staff.name,
                    Organization: organizationName,
                },
            });
        } catch (emailErr) {
            console.error('Welcome email sending failed:', emailErr);
        }

        // Generate verification token and send verification email
        try {
            const verificationToken = await generateVerificationToken(
                staff.id.toString(),
                staff.email
            );
            const verificationUrl = createVerificationUrl(verificationToken);

            await sendEmail({
                to: staff.email,
                subject: 'Verify Your Email - Hwil',
                template: 'verify_email_staff',
                context: {
                    username: staff.name,
                    Organization: organizationName,
                    verificationLink: verificationUrl
                },
            });
        } catch (emailErr) {
            console.error('Verification email sending failed:', emailErr);
        }

        res.status(201).json({
            message: 'Staff registered successfully. Please check your email to verify your account.',
            requiresEmailVerification: true,
            organizationId: invite.organizationId,
            organizationName,
        });

    } catch (error) {
        console.error('Error registering staff with token:', error);
        res.status(500).json({ message: 'Error registering staff' });
    }
};


export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            res.status(400).json({ message: 'Invalid or missing token' });
            return;
        }

        // Hash the token to compare with stored token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find valid token
        const verificationToken = await EmailVerificationToken.findOne({
            token: hashedToken,
            expiresAt: { $gt: new Date() }
        });

        if (!verificationToken) {
            res.status(400).json({ message: 'Invalid or expired verification token' });
            return;
        }

        // Find user in both User and Staff collections
        let account = await User.findById(verificationToken.userId);
        let isStaff = false;

        if (!account) {
            account = await Staff.findById(verificationToken.userId);
            isStaff = true;
        }

        if (!account) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Update email verification status
        account.emailVerified = true;
        account.emailVerifiedAt = new Date();
        await account.save();

        // Delete the used token
        await EmailVerificationToken.deleteOne({ _id: verificationToken._id });

        // Generate tokens for automatic login after verification
        const payload = {
            id: account.id.toString(),
            email: account.email,
            role: account.role,
            organizationId: account.organizationId.toString(),
            ...(isStaff && { managerId: (account as any).managerId?.toString() }),
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: parseTimeToSeconds(process.env.JWT_REFRESH_EXPIRES || '7d') * 1000,
            path: '/'
        });

        res.status(200).json({
            message: 'Email verified successfully',
            user: {
                id: account.id.toString(),
                name: account.name,
                email: account.email,
                role: account.role
            },
            accessToken,
            organizationId: account.organizationId
        });

    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({ message: 'Error verifying email' });
    }
};

// Add resend verification email endpoint
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            res.status(400).json({ message: 'Email is required' });
            return;
        }

        const normalizedEmail = email.toLowerCase();

        // Find user in both collections
        let account = await User.findOne({ email: normalizedEmail });
        if (!account) {
            account = await Staff.findOne({ email: normalizedEmail });
        }

        if (!account) {
            // Don't reveal if email exists or not
            res.status(200).json({ message: 'If the email exists, a verification link has been sent' });
            return;
        }

        if (account.emailVerified) {
            res.status(400).json({ message: 'Email already verified' });
            return;
        }

        // Delete any existing tokens for this user
        await EmailVerificationToken.deleteMany({ userId: account._id });

        // Generate new verification token
        const verificationToken = await generateVerificationToken(
            account.id.toString(),
            account.email
        );
        const verificationUrl = createVerificationUrl(verificationToken);

        // Determine organization name
        let organizationName = 'Hwil';
        if (account.organizationId) {
            const org = await Organization.findById(account.organizationId);
            organizationName = org?.name || 'Hwil';
        }

        // Send verification email
        await sendEmail({
            to: account.email,
            subject: 'Verify Your Email - Hwil',
            template: account.role === 'staff' ? 'verify_email_staff' : 'verify_email',
            context: {
                username: account.name,
                verificationLink: verificationUrl,
                ...(account.role === 'staff' && { Organization: organizationName })
            },
        });

        res.status(200).json({ message: 'Verification email sent successfully' });

    } catch (error) {
        console.error('Error resending verification email:', error);
        res.status(500).json({ message: 'Error sending verification email' });
    }
};



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





export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id; // Assuming you have auth middleware that sets req.user

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: 'Current password and new password are required' });
            return;
        }

        // Find user in both User and Staff collections
        let account = await User.findById(userId);
        let isStaff = false;

        if (!account) {
            account = await Staff.findById(userId);
            isStaff = true;
        }

        if (!account) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, account.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Current password is incorrect' });
            return;
        }

        // Check if new password is same as current password
        const isSamePassword = await bcrypt.compare(newPassword, account.password);
        if (isSamePassword) {
            res.status(400).json({ message: 'New password must be different from current password' });
            return;
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password
        account.password = hashedPassword;
        await account.save();

        // Clear both cookies to log the user out
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            path: '/'
        });

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            path: '/'
        });

        res.status(200).json({
            message: 'Password changed successfully. Please login again with your new password.',
            requiresLogin: true
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Error changing password' });
    }
};


export const deleteStaff = async(req: Request, res: Response): Promise<void> => {
    try {
        const managerId = req.user?.id;
        const managerRole = req.user?.role;

        if (!managerId || managerRole !== 'manager') {
            res.status(401).json({ message: "Unauthorized - only managers can delete staff" });
            return;
        }

        const staffId = req.params.id;
        if (!staffId) {
            res.status(400).json({ message: "Staff ID is required" });
            return;
        }

        const staffMember = await Staff.findById(staffId);
        if (!staffMember) {
            res.status(404).json({ message: "Staff member not found" });
            return;
        }

        // Verify that staff belongs to the manager's organization
        if (staffMember.organizationId.toString() !== req.user?.organizationId) {
            res.status(403).json({ message: "You can only delete staff from your organization" });
            return;
        }

        // Verify this manager manages the staff member
        if (staffMember.managerId.toString() !== managerId) {
            res.status(403).json({ message: "You can only delete staff you manage" });
            return;
        }

        // Delete all associated data

        // 1. Delete all shifts assigned to this staff member
        await Shift.deleteMany({ assignedTo: staffId });

        // 2. Delete any pending invites for this email
        await Invite.deleteMany({ email: staffMember.email });
        await InviteToken.deleteMany({ email: staffMember.email });

        // 3. Delete any password reset tokens
        await PasswordResetToken.deleteMany({ userId: staffId });

        // 4. Delete any email verification tokens
        await EmailVerificationToken.deleteMany({ userId: staffId });

        // 5. Send deletion notification email (before actually deleting)
        try {
            const org = await Organization.findById(staffMember.organizationId);
            await sendEmail({
                to: staffMember.email,
                subject: 'Account Deletion Notice - Hwil',
                template: 'account_deleted',
                context: {
                    username: staffMember.name,
                    organizationName: org?.name || 'Hwil'
                },
            });
        } catch (emailErr) {
            console.error('Failed to send account deletion email:', emailErr);
            // Don't fail the deletion if email fails
        }

        // 6. Finally, delete the staff member
        await Staff.findByIdAndDelete(staffId);

        // Send success response AFTER everything is deleted
        res.status(200).json({
            message: "Staff member deleted successfully",
            deletedStaffId: staffId,
            deletedStaffName: staffMember.name
        });

    } catch (error) {
        console.error('Error deleting staff member:', error);
        res.status(500).json({ message: 'Error while deleting staff member' });
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