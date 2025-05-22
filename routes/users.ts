import express from 'express';
import { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { User } from '../models/User';
import bcrypt from 'bcrypt';

const router = express.Router();

// Get all users (only from the same organization)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const users = await User.find(
            { organizationId: req.user.organizationId },
            { password: 0 } // Exclude passwords from response
        );
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Add a new user
router.post('/add', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role,
            organizationId: req.user.organizationId,
        });

        await newUser.save();
        
        const userToReturn = newUser.toObject();
        delete (userToReturn as { password?: string }).password;
        
        res.status(201).json(userToReturn);
    } catch (error: any) {
        console.error('Error creating user:', error);

        if (error.code === 11000) {
            res.status(400).json({ message: 'Email already exists' });
            return;
        }

        res.status(500).json({ message: 'Error creating user' });
    }
});


export default router;