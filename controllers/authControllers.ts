import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { sendEmail } from '../utils/email';
import { Staff } from '../models/Staff';
import { InviteToken } from '../models/InviteToken';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');

// POST /auth/register – Manager onboarding
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, organizationName } = req.body;

    if (!name || !email || !password || !organizationName) {
      res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ error: 'User already exists' });
        return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = new User({
      name,
      email,
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
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: 'Manager and organization created',
      accessToken,
      organizationId: savedOrg._id,
    });
    try {
      await sendEmail({
        to: email,
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
    return;
  }
};

// POST /auth/login – Authenticate user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: 'Invalid credentials' });
        return;
    }

    if (!user.organizationId) {
      res.status(401).json({ message: 'User not linked to any organization' });
        return;
    }

    const payload = {
      id: user.id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ 
        message: "Logged in Successfully",
        accessToken,
        refreshToken,
        organizationId: user.organizationId,
     });
    return;
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
    return;
  }
};


export const registerStaffWithToken = async (req: Request, res: Response): Promise<void> => {
  try{
    const { token } = req.query;
    const { name, password } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ message: 'Invalid or missing token' });
      return;
    }

    if(!name || !password){
      res.status(400).json({ message: 'Name and password are required' });
      return;
    }

    const invite = await InviteToken.findOne({ token });

    if (!invite){
      res.status(400).json({ message: 'Invalid invite token' });
      return;
    }

    if (invite.expiresAt < new Date()) {
      res.status(400).json({ message: 'Invite token has expired' });
      return;
    }

    if (invite.used) {
      res.status(400).json({ message: 'Invite token has already been used' });
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

    invite.used = true;
    await invite.save();


    const payload = {
      id: (staff.id as import('mongoose').Types.ObjectId).toString(),
      email: staff.email,
      role: 'staff',
      organizationId: (staff.organizationId as import('mongoose').Types.ObjectId).toString(),
      managerId: (staff.managerId as import('mongoose').Types.ObjectId).toString(),
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({
      message: 'Staff registered successfully',
      accessToken,
      refreshToken,
      organizationId: invite.organizationId,
    });


  } catch (error) {
    console.error('Error registering staff with token:', error);
    res.status(500).json({ message: 'Error registering staff' });
  }
}












// POST /auth/logout – Logout user
export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
    return;
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
    return;
  }
};