import express from 'express';
import { createShift, getShifts, getMyShift, getShiftById, updateShift, deleteShift, getOpenShifts, claimOpenShift, createOpenShift, clockInShift, clockOutShift } from '../controllers/shiftController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/uploads';

import { uploadShiftFromSpreadsheet, approveShift } from '../controllers/shiftController';



const router = express.Router();

// Route to create a new shift
router.post('/add', authMiddleware, createShift);

// Route to get all shifts
router.get('/getall', authMiddleware, getShifts);

// Route to get a specific shift by ID
router.get('/:id', authMiddleware, getShiftById);

// Route to get the current user's shifts
router.get('/my-shifts', authMiddleware, getMyShift);

// Route to update a specific shift by ID
router.put('/:id', authMiddleware, updateShift);

// Route to delete a specific shift by ID
router.delete('/:id', authMiddleware, deleteShift);

// create open shift
router.post('/open', authMiddleware, createOpenShift);

// claim open shift
router.post('/claim/:id', authMiddleware, claimOpenShift);

// Route to get all open shifts
router.get('/open', authMiddleware, getOpenShifts);

// clock in
router.post('/clock-in/:id', authMiddleware, clockInShift);

// clock out

router.post('/:id/clock-out', authMiddleware, clockOutShift);


// Route to upload shifts from a spreadsheet
router.post('/upload', authMiddleware, upload.single('file'), uploadShiftFromSpreadsheet);


// Route to approve a shift
router.patch('/:id/approve', authMiddleware, approveShift);





export default router;