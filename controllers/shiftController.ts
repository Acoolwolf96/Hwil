import { Request, Response, NextFunction } from 'express';
import xlsx from 'xlsx';
import { Staff } from '../models/Staff';

import { Shift } from '../models/Shift';
import {sendEmail} from "../utils/email";
import {Types} from "mongoose";



export const createShift = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;

        if (user.role !== 'manager') {
            res.status(403).json({ message: 'Forbidden, Only managers can create shifts' });
            return;
        }

        const { name, assignedTo, date, startTime, endTime, location, notes } = req.body;

        if (!name || !date || !startTime || !endTime) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        // Validate assignedTo is provided for non-open shifts
        if (!assignedTo) {
            res.status(400).json({ message: 'Staff member must be assigned to shift' });
            return;
        }

        const shift = await Shift.create({
            name,
            organizationId: user.organizationId,
            assignedTo,
            date: new Date(date),
            startTime,
            endTime,
            location: location || 'Main Location',
            notes,
            status: 'assigned',
            isOpen: false,
            createdBy: user.id,
        });

        const staff = await Staff.findById(assignedTo);
        if (staff && staff.email) {
            try {
                await sendEmail({
                    to: staff.email,
                    subject: 'New Shift Assigned to You',
                    template: 'shift_schedule_created',
                    context: {
                        shifts: [{
                            name: shift.name,
                            date: shift.date.toDateString(),
                            startTime: shift.startTime,
                            endTime: shift.endTime,
                            location: shift.location,
                            notes: shift.notes
                        }],
                        totalShifts: 1
                    },
                });
            } catch (emailErr) {
                console.error('Failed to send shift notification email:', emailErr);
            }
        }

        res.status(201).json({
            message: 'Shift created successfully',
            shift: {
                ...shift.toObject(),
                notificationSent: !!staff?.email
            }
        });
    } catch (error) {
        console.error('Error creating shift:', error);
        res.status(500).json({
            message: 'Internal server error', error
        });
    }
};

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
    try {
        const user = req.user;
        const { id } = req.params;

        const shift = await Shift.findById(id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }

        // Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }

        // Allow if:
        // User is a manager in the same organization
        // OR User is the assigned user
        const isManager = user.role === 'manager';
        const isAssignedStaff = shift.assignedTo && shift.assignedTo._id &&
            shift.assignedTo._id.toString() === user.id.toString();

        if (!isManager && !isAssignedStaff) {
            res.status(403).json({ message: 'Forbidden: You are not authorized to access this shift' });
            return;
        }

        // Return the shift data in the expected format
        res.status(200).json(shift); // Return shift directly, not wrapped in object

    } catch (error) {
        console.error('Error fetching shift by ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const updateShift = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { id } = req.params;

        // Populate the original shift to get staff details
        const shift = await Shift.findById(id).populate<{ assignedTo: { _id: Types.ObjectId, email: string, name: string } }>('assignedTo');
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }

        // Only managers can update shifts
        if (user.role !== 'manager' || shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Only managers can update shifts' });
            return;
        }

        const { staff, date, startTime, endTime, location, notes } = req.body;

        // Get the original assigned staff before updating
        const originalAssignedTo = shift.assignedTo?._id?.toString();
        const newAssignedTo = staff?.toString();

        // Update the shift and populate the assigned staff
        const updatedShift = await Shift.findByIdAndUpdate(id, {
            assignedTo: staff,
            date: new Date(date),
            startTime,
            endTime,
            location,
            notes,
        }, { new: true })
            .populate<{ assignedTo: { _id: Types.ObjectId, email: string, name: string } }>('assignedTo', 'email name')
            .populate('createdBy', 'name email');

        if (!updatedShift) {
            res.status(404).json({ message: 'Shift not found after update' });
            return;
        }

        // Check if we should send notifications
        const shouldNotify = (
            // Staff assignment changed
            (newAssignedTo && originalAssignedTo !== newAssignedTo) ||
            // Shift details changed
            shift.date.toString() !== new Date(date).toString() ||
            shift.startTime !== startTime ||
            shift.endTime !== endTime ||
            shift.location !== location
        );

        type EmailTemplate = "shift_updated" | "welcome_email" | "reset_password" | "permission_updated" | "invite_staff" | "shift_reminder" | "staff_registration_success" | "shift_schedule_created" | 'shift_cancelled';

        // Send notification to new assigned staff if changes were made
        if (shouldNotify && updatedShift.assignedTo && updatedShift.assignedTo.email) {
            try {
                const shiftUpdate = {
                    date: updatedShift.date.toDateString(),
                    oldDate: shift.date.toDateString(),
                    newDate: updatedShift.date.toDateString(),
                    oldStartTime: shift.startTime,
                    newStartTime: updatedShift.startTime,
                    oldEndTime: shift.endTime,
                    newEndTime: updatedShift.endTime,
                    oldLocation: shift.location,
                    newLocation: updatedShift.location
                };


                const emailPayload = {
                    to: updatedShift.assignedTo.email,
                    subject: 'Your Shift Has Been Updated',
                    template: "shift_updated" as EmailTemplate,
                    context: {
                        username: updatedShift.assignedTo.name || 'there',
                        shifts: [shiftUpdate]
                    },
                };
                await sendEmail(emailPayload);
            } catch (emailErr) {
                console.error('Failed to send shift update notification:', emailErr);
            }
        }

        // Notify previous staff if assignment changed
        if (originalAssignedTo && originalAssignedTo !== newAssignedTo && shift.assignedTo && shift.assignedTo.email) {
            try {

                const emailPayload = {
                    to: shift.assignedTo.email,
                    subject: 'You Have Been Removed from a Shift',
                    template: "shift_cancelled" as EmailTemplate,
                    context: {
                        username: shift.assignedTo.name || 'there',
                        date: shift.date.toDateString(),
                        startTime: shift.startTime,
                        endTime: shift.endTime,
                        location: shift.location || 'Not specified',
                        reason: 'You have been unassigned from this shift'
                    },
                };
                await sendEmail(emailPayload);
            } catch (emailErr) {
                console.error('Failed to send shift removal notification:', emailErr);
            }
        }

        res.status(200).json({
            message: 'Shift updated successfully',
            shift: updatedShift,
            notificationSent: shouldNotify && !!updatedShift.assignedTo?.email
        });
    } catch (error) {
        console.error('Error updating shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


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
        const isAssignedStaff = shift.assignedTo && shift.assignedTo.toString() === user.id.toString();
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
    try {
        const user = req.user;
        const { id } = req.params;
        const { completionNotes, actualEndTime } = req.body;

        const shift = await Shift.findById(id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return;
        }

        // Prevent access across organizations
        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }

        // Check if user is assigned to this shift
        const isAssignedStaff = shift.assignedTo && shift.assignedTo.toString() === user.id.toString();

        if (!isAssignedStaff) {
            res.status(403).json({ message: 'Forbidden: You are not assigned to this shift' });
            return;
        }

        // Update shift to completed
        shift.status = 'completed';
        shift.ApprovalStatus = 'pending'; // Set approval to pending
        shift.clockOutTime = new Date(); // Set clock out time
        shift.notes = completionNotes ? `${shift.notes || ''}\nCompletion Notes: ${completionNotes}` : shift.notes;

        // Calculate worked hours if clockInTime exists
        if (shift.clockInTime) {
            const durationMs = shift.clockOutTime.getTime() - shift.clockInTime.getTime();
            const hours = durationMs / (1000 * 60 * 60);
            shift.workedHours = parseFloat(hours.toFixed(2));
        }

        await shift.save();

        const updatedShift = await Shift.findById(id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        res.status(200).json({ message: 'Shift marked as completed', shift: updatedShift });

    } catch (error) {
        console.error('Error marking shift as completed:', error);
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
    try {
        const user = req.user;

        if (user.role !== 'staff') {
            res.status(403).json({ message: 'Forbidden: Only staff can clock in' });
            return
        }

        const shift = await Shift.findById(req.params.id);
        if (!shift) {
            res.status(404).json({ message: 'Shift not found' });
            return
        }

        if (shift.organizationId.toString() !== user.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different organization' });
            return
        }

        if (shift.assignedTo.toString() !== user.id.toString()) {
            res.status(403).json({ message: 'Forbidden: You are not assigned to this shift' });
            return
        }

        if (shift.clockInTime) {
            res.status(403).json({ message: 'Forbidden: You have already clocked in' });
            return
        }

        const now = new Date();

        // Combine shift.date and shift.startTime to get shift start datetime
        const [hour, minute] = shift.startTime.split(':').map(Number);
        const shiftStart = new Date(shift.date);
        shiftStart.setHours(hour, minute, 0, 0);



        // Allow clock-in only if within 1 hour before shift start
        const oneHourBeforeShift = new Date(shiftStart.getTime() - 60 * 60 * 1000);
        if (now < oneHourBeforeShift) {
            res.status(403).json({ message: 'Forbidden: You can only clock in within 1 hour before the shift start time' });
            return
        }

        shift.clockInTime = now;
        shift.status = 'in-progress';
        await shift.save();

        res.status(200).json({ message: 'Clocked in successfully', shift });
        return
    } catch (error) {
        console.error('Error clocking in shift:', error);
        res.status(500).json({ message: 'Internal server error' });
        return
    }
};



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
        const staffShiftMap = new Map<string, any[]>();

        for (const [index, row] of data.entries()) {
            try {
                const { name, staffEmail, date, startTime, endTime, role, location, notes } = row as any;

                if (!name || !staffEmail || !date || !startTime || !endTime) {
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

                const shiftData = {
                    name,
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
                };
                shiftsToInsert.push(shiftData);

                // Add shift to staff's notification map
                if (!staffShiftMap.has(staffEmail)) {
                    staffShiftMap.set(staffEmail, []);
                }
                staffShiftMap.get(staffEmail)?.push(shiftData);

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

        try{
            for (const [email, shifts] of staffShiftMap.entries()){
                await sendEmail({
                    to: email,
                    subject: 'New Shifts Assigned',
                    template: 'shift_schedule_created',
                    context: {
                        shifts: shifts.map(shift => ({
                            name: shift.name,
                            date: shift.date.toDateString(),
                            startTime: shift.startTime,
                            endTime: shift.endTime,
                            location: shift.location,
                            notes: shift.notes
                        })),
                        totalShifts: shifts.length
                    },
                });

            }
        } catch (emailErr) {
            console.error('Failed to send some shift notification emails:', emailErr);
        }

    } catch (error) {
        console.error('Error uploading shifts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



export const approveShift = async (req: Request, res: Response) => {
    try {
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

        // Prevent access across organizations
        if (shift.organizationId.toString() !== manager.organizationId.toString()) {
            res.status(403).json({ message: 'Forbidden: Different Organization' });
            return;
        }

        // Check if shift is completed
        if (shift.status !== 'completed') {
            res.status(400).json({ message: 'Shift must be completed before approval' });
            return;
        }

        // Update ApprovalStatus to approved
        shift.ApprovalStatus = 'approved';
        await shift.save();

        const updatedShift = await Shift.findById(id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        res.status(200).json({ message: 'Shift approved successfully', shift: updatedShift });

    } catch (error) {
        console.error('Error approving shift:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}