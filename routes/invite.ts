import express from 'express';
import { sendInvite } from '../controllers/inviteController';
import { authMiddleware } from '../middleware/auth';


const router = express.Router();

// POST /invite/send – Send an invite to a staff member
router.post('/', authMiddleware, sendInvite);


export default router;