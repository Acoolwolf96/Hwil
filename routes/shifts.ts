import express from 'express';
import {
    createShift,
    getShifts,
    getMyShift,
    getShiftById,
    updateShift,
    rejectShift,
    deleteShift,
    getOpenShifts,
    claimOpenShift,
    createOpenShift,
    clockInShift,
    clockOutShift,
    markShiftAsCompleted,
    createBulkShifts
} from '../controllers/shiftController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/uploads';

import { uploadShiftFromSpreadsheet, approveShift } from '../controllers/shiftController';



const router = express.Router();


router.post('/add', authMiddleware, createShift);

router.post('/bulk', authMiddleware, createBulkShifts);
router.post('/upload', authMiddleware, upload.single('file'), uploadShiftFromSpreadsheet);
router.post('/open', authMiddleware, createOpenShift);

router.get('/getAll', authMiddleware, getShifts);
router.get('/my-shifts', authMiddleware, getMyShift);
router.get('/open', authMiddleware, getOpenShifts);

router.post('/claim/:id', authMiddleware, claimOpenShift);
router.post('/clock-in/:id', authMiddleware, clockInShift);
router.post('/:id/clock-out', authMiddleware, clockOutShift);

router.patch('/:id/complete', authMiddleware, markShiftAsCompleted);
router.patch('/:id/approve', authMiddleware, approveShift);
router.patch('/:id/reject', authMiddleware, rejectShift);


router.get('/:id', authMiddleware, getShiftById);
router.put('/:id', authMiddleware, updateShift);
router.delete('/:id', authMiddleware, deleteShift);





export default router;