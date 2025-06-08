import { Request, Response, NextFunction } from 'express';
import xlsx from 'xlsx';
import { Staff } from '../models/Staff';

import { Shift } from '../models/Shift';



export const createShift = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;

        if(user.role !== 'manager') {
            res.status(403).json({ message: 'Forbidden, Only managers can create shifts' });
            return;
        }

        const { name, date, startTime, endTime, location, notes } = req.body;

        if (!name || !date || !startTime || !endTime) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        const shift = await Shift.create({
            name,
            organizationId: user.organizationId,
            date: new Date(date),
            startTime,
            endTime,
            location,
            notes,
            status: 'assigned',
            isOpen: false,
            createdBy: user.id,
        });
        res.status(201).json({ message: 'Shift created successfully', shift });
    } catch (error) {
        console.error('Error creating shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const getShifts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;

        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const shifts = await Shift.find({ organizationId: user.organizationId })
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .sort({ date: -1 });

        res.status(200).json({ shifts });
    } catch (error) {
        console.error('Error fetching shifts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


export const getMyShift = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;

        const shifts = await Shift.find({ 
            assignedTo: user.id,
            organizationId: user.organizationId
         }).sort({ date: 1 });
        res.status(200).json({ shifts });
    } catch (error) {
        console.error('Error fetching own shifts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


export const getShiftById = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user =req.user;
        const { id } = req.params;

        const shift = await Shift.findById(id)


        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }


        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }

        //Allow if
        // User is a manager in the same organization
        // OR User is the assigned user

        const isManager = user.role === 'manager' && shift.organizationId.toString() === user.organizationId.toString();
        const isAssignedStaff = shift.assignedTo.toString() === user.id.toString();

        if (!isManager && !isAssignedStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to access this shift' });
            return;
        }
        res.status(200).json({ shift });
    
    } catch (error) {
        console.error('Error fetching shift by ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
export const updateShift = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;
        const { id } = req.params;

        const shift = await Shift.findById(id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }
        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }
        //Allow if
        // User is a manager in the same organization
        // OR User is the assigned user
        const isManager = user.role === 'manager' && shift.organizationId.toString() === user.organizationId.toString();
        const isAssignedStaff = shift.assignedTo.toString() === user.id.toString();
        if (!isManager && !isAssignedStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to access this shift' });
            return;
        }
        const { name, assignedTo, date, startTime, endTime, role, location, notes } = req.body;
        if (!name || !assignedTo || !date || !startTime || !endTime) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        const updatedShift = await Shift.findByIdAndUpdate(id, {
            name,
            assignedTo,
            date: new Date(date),
            startTime,
            endTime,
            role,
            location,
            notes,
        }, { new: true });
        res.status(200).json({ message: 'Shift updated successfully', shift: updatedShift });
    } catch (error) {
        console.error('Error updating shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


export const deleteShift = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;
        const { id } = req.params;

        const shift = await Shift.findById(id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }
        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }
        //Allow if
        // User is a manager in the same organization
        // OR User is the assigned user
        const isManager = user.role === 'manager' && shift.organizationId.toString() === user.organizationId.toString();
        const isAssignedStaff = shift.assignedTo.toString() === user.id.toString();
        if (!isManager && !isAssignedStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to access this shift' });
            return;
        }
        await Shift.findByIdAndDelete(id);
        res.status(200).json({ message: 'Shift deleted successfully' });
    } catch (error) {
        console.error('Error deleting shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}





export const markShiftAsCompleted = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;
        const { id } = req.params;

        const shift = await Shift.findById(id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }
        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }
        //Allow if
        // User is a manager in the same organization
        // OR User is the assigned user
        const isManager = user.role === 'manager' && shift.organizationId.toString() === user.organizationId.toString();
        const isAssignedStaff = shift.assignedTo.toString() === user.id.toString();
        if (!isManager && !isAssignedStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to access this shift' });
            return;
        }
        
    } catch (error) {
        console.error('Error deleting shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
export const markShiftAsMissed = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;
        const { id } = req.params;

        const shift = await Shift.findById(id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }
        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }
        //Allow if
        // User is a manager in the same organization
        // OR User is the assigned user
        const isManager = user.role === 'manager' && shift.organizationId.toString() === user.organizationId.toString();
        const isAssignedStaff = shift.assignedTo.toString() === user.id.toString();
        if (!isManager && !isAssignedStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to access this shift' });
            return;
        }
        
    } catch (error) {
        console.error('Error deleting shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
export const markShiftAsCancelled = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;
        const { id } = req.params;

        const shift = await Shift.findById(id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }
        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }
        //Allow if
        // User is a manager in the same organization
        // OR User is the assigned user
        const isManager = user.role === 'manager' && shift.organizationId.toString() === user.organizationId.toString();
        const isAssignedStaff = shift.assignedTo.toString() === user.id.toString();
        if (!isManager && !isAssignedStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to access this shift' });
            return;
        }
        
    } catch (error) {
        console.error('Error deleting shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
export const markShiftAsOpen = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;
        const { id } = req.params;

        const shift = await Shift.findById(id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }
        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }
        //Allow if
        // User is a manager in the same organization
        // OR User is the assigned user
        const isManager = user.role === 'manager' && shift.organizationId.toString() === user.organizationId.toString();
        const isAssignedStaff = shift.assignedTo.toString() === user.id.toString();
        if (!isManager && !isAssignedStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to access this shift' });
            return;
        }
        
    } catch (error) {
        console.error('Error deleting shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
export const markShiftAsClosed = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;
        const { id } = req.params;

        const shift = await Shift.findById(id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }
        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }
        //Allow if
        // User is a manager in the same organization
        // OR User is the assigned user
        const isManager = user.role === 'manager' && shift.organizationId.toString() === user.organizationId.toString();
        const isAssignedStaff = shift.assignedTo.toString() === user.id.toString();
        if (!isManager && !isAssignedStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to access this shift' });
            return;
        }
        
    } catch (error) {
        console.error('Error deleting shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


export const createOpenShift = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;

        if(user.role !== 'manager') {
            res.status(403).json({ message: 'Forbidden, Only managers can create shifts' });
            return;
        }

        const { date, startTime, endTime, role, location, notes } = req.body;

        if (!date || !startTime || !endTime) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        const shift = await Shift.create({
            organizationId: user.organizationId,
            assignedTo: null,
            date: new Date(date),
            startTime,
            endTime,
            role,
            location,
            notes,
            status: 'open',
            isOpen: true,
            createdBy: user.id,
        });
        res.status(201).json({ message: 'Shift created successfully', shift });
    } catch (error) {
        console.error('Error creating shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


export const claimOpenShift = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;

        if(user.role !== 'staff') {
            res.status(403).json({ message: 'Forbidden, Only staff can claim open shifts' });
            return;
        }

        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }
        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }

        //Allow if
        
        if(!shift.isOpen || shift.status !== 'open') {
            res.status(403).json({ message: 'Forbidden: Shift is not open for claiming' });
            return;
        }

        shift.status = 'assigned';
        shift.isOpen = false;

        await shift.save();

        res.status(200).json({ message: 'Shift claimed successfully', shift });
    } catch (error) {
        console.error('Error claiming open shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


export const getOpenShifts = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user;

        const openShifts = await Shift.find({
            organizationId: user.organizationId,
            isOpen: true,
            status: 'open'
        }).sort({ date: 1 })

        res.status(200).json({ openShifts });
    } catch (error) {
        console.error('Error fetching open shifts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


export const clockInShift = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const user = req.user

        if(user.role !== 'staff') {
            res.status(403).json({ message: 'Forbidden, Only staff can clock in' });
            return;
        }

        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }

        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }

        //Allow if
        if(shift.assignedTo.toString() !== user.id.toString()) {
            res.status(403).json({ message: 'Forbidden: You are not assigned to this shift' });
            return;
        }
        if(shift.clockInTime) {
            res.status(403).json({ message: 'Forbidden: You have already clocked in' });
            return;
        }

        const now = new Date();
        const shiftDate = new Date(shift.date);
        if (now < shiftDate) {
            res.status(403).json({ message: 'Forbidden: You cannot clock in before the shift date' });
            return;
        }

        shift.clockInTime = now;
        shift.status = 'in-progress';
        await shift.save();

        res.status(200).json({ message: 'Clocked in successfully', shift: Shift });
    } catch (error) {
        console.error('Error clocking in shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


export const clockOutShift = async (req: Request, res: Response) => {
    try{
        const user = req.user
        if(user.role !== 'staff') {
            res.status(403).json({ message: 'Forbidden, Only staff can clock out' });
            return;
        }

        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }
        //Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }
        //Allow if
        if(shift.assignedTo.toString() !== user.id.toString()) {
            res.status(403).json({ message: 'Forbidden: You are not assigned to this shift' });
            return;
        }
        if(shift.clockOutTime) {
            res.status(403).json({ message: 'Forbidden: You have already clocked out' });
            return;
        }   

        const now = new Date();
        shift.clockOutTime = now;

        // Ensure clockInTime is defined before calculating worked hours
        if (!shift.clockInTime) {
            res.status(400).json({ message: 'Cannot clock out: clock in before clocking out.' });
            return;
        }

        // Calculate worked hours
        const durationMs = now.getTime() - shift.clockInTime.getTime();
        const hours = durationMs / (1000 * 60 * 60);
        shift.workedHours = parseFloat(hours.toFixed(2));
        shift.status = 'completed';
        await shift.save();

        
        res.status(200).json({ message: 'Clocked out successfully', shift });


    } catch (error) {
        console.error('Error clocking out shift:', error);
        res.status(500).json({ message: 'Internal server error: Error clocking out' });
    }
}


export const uploadShiftFromSpreadsheet = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        
        if (!user || user.role !== 'manager') {
            res.status(403).json({ message: 'Forbidden: Only managers can upload shifts' });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        const workbook = xlsx.read(req.file.buffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (!data.length) {
            res.status(400).json({ message: 'No data found in spreadsheet' });
            return;
        }

        const shiftsToInsert = [];
        const errors = [];

        for (const [index, row] of data.entries()) {
            try {
                const { staffEmail, date, startTime, endTime, role, location, notes } = row as any;

                if (!staffEmail || !date || !startTime || !endTime) {
                    errors.push(`Row ${index + 2}: Missing required fields`);
                    continue;
                }

                const staff = await Staff.findOne({
                    email: staffEmail,
                    organizationId: user.organizationId
                });

                if (!staff) {
                    errors.push(`Row ${index + 2}: Staff with email ${staffEmail} not found`);
                    continue;
                }

                shiftsToInsert.push({
                    organizationId: user.organizationId,
                    assignedTo: staff._id,
                    date: new Date(date),
                    startTime,
                    endTime,
                    role: role || 'staff',
                    location: location || 'Main Location',
                    notes: notes || '',
                    status: 'assigned',
                    createdBy: user.id,
                });
            } catch (err) {
                if (err instanceof Error) {
                    errors.push(`Row ${index + 2}: ${err.message}`);
                } else {
                    errors.push(`Row ${index + 2}: Error processing row`);
                }
            }
        }

        if (shiftsToInsert.length === 0) {
            res.status(400).json({ 
                message: 'No valid shifts to import',
                errors 
            });
            return;
        }

        const result = await Shift.insertMany(shiftsToInsert);

        res.status(201).json({ 
            message: 'Shifts uploaded successfully',
            shifts: result.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Error uploading shifts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



export const approveShift = async (req: Request, res: Response) => {
    try{
        const { id } = req.params;
        const manager = req.user;
        if (manager.role !== 'manager') {
            res.status(403).json({ message: 'Forbidden, Only managers can approve shifts' });
            return;
        }

        const shift = await Shift.findById(id);

        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }

        //Prevent access across organizations
        if (shift.organizationId.toString() !== manager.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }

        // Allow if
        if (shift.status !== 'completed') {
            res.status(400).json({ message: 'Shift cannot be approved unless it is completed' });
            return;
        }

        shift.ApprovalStatus = 'approved';
        await shift.save();

        res.status(200).json({ message: 'Shift approved successfully', shift });

    } catch (error) {
        console.error('Error approving shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
