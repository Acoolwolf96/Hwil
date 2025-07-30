
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getStaffApprovals, getApprovalStats } from '../controllers/approvalControllers';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all approvals for staff
router.get('/staff', getStaffApprovals);

// Get approval statistics
router.get('/stats', getApprovalStats);

export default router;