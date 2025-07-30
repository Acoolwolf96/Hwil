import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
    getLeaveBalance,
    submitLeaveRequest,
    getMyLeaveRequests,
    getAllLeaveRequests,
    getStaffBalances,
    reviewLeaveRequest,
    assignLeave,
    getLeaveReport,
    cancelLeaveRequest,
    getLeaveStats,
    uploadDoctorReport,
    setAnnualLeaveDays
} from '../controllers/leaveControllers';

const router = express.Router();

// Staff routes
router.get('/balance', authMiddleware, getLeaveBalance);
router.get('/my-requests', authMiddleware, getMyLeaveRequests);
router.post('/request', authMiddleware, uploadDoctorReport, submitLeaveRequest);
router.put('/cancel/:id', authMiddleware, cancelLeaveRequest);

// Manager routes
router.get('/all-requests', authMiddleware, getAllLeaveRequests);
router.get('/staff-balances', authMiddleware, getStaffBalances);
router.put('/review/:id', authMiddleware, reviewLeaveRequest);
router.post('/assign', authMiddleware, assignLeave);
router.post('/set-leave-days', authMiddleware, setAnnualLeaveDays);
router.get('/report', authMiddleware, getLeaveReport);

// Common routes
router.get('/stats', authMiddleware, getLeaveStats);

export default router;