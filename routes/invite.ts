import express from 'express';
import { sendInvite } from '../controllers/inviteController';
import { authMiddleware } from '../middleware/auth';
import { registerStaffWithToken } from '../controllers/authControllers';


const router = express.Router();

// POST /invite/send – Send an invite to a staff member
router.post('/', authMiddleware, sendInvite);



// POST /invite/register – Register a staff member using an invite token
router.post('/register/staff', authMiddleware, registerStaffWithToken);


export default router;