import express from 'express';
import {sendInvite, getInvites, verifyStaffToken, getInvitesForOrganization} from '../controllers/inviteController';
import { authMiddleware } from '../middleware/auth';
import {registerStaffWithToken, resendVerificationEmail, verifyEmail} from '../controllers/authControllers';


const router = express.Router();

//get all invites sent
router.get('/getInvites', authMiddleware, getInvites);

// get invites for organization

router.get('/getOrgInvites', authMiddleware, getInvitesForOrganization)

// POST /invite/send – Send an invite to a staff member
router.post('/', authMiddleware, sendInvite);


// POST /invite/register – Register a staff member using an invite token
router.post('/register/staff', registerStaffWithToken);

router.get('/verify', verifyStaffToken);

router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);


export default router;