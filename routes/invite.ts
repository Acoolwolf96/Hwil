import express from 'express';
import { sendInvite, getInvites } from '../controllers/inviteController';
import { authMiddleware } from '../middleware/auth';
import { registerStaffWithToken } from '../controllers/authControllers';


const router = express.Router();

//get all invites sent
router.get('/getInvites', authMiddleware, getInvites);

// POST /invite/send – Send an invite to a staff member
router.post('/', authMiddleware, sendInvite);


// POST /invite/register – Register a staff member using an invite token
router.post('/register/staff', authMiddleware, registerStaffWithToken);


export default router;