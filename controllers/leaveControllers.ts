import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { Leave, ILeave } from '../models/Leave';
import { LeaveBalance } from '../models/LeaveBalance';
import { User } from '../models/User';
import { Staff, IStaff } from '../models/Staff';
import { sendEmail } from '../utils/email';
import { Types } from 'mongoose';
import { notifyManagerOfLeaveRequest, notifyStaffOfLeaveUpdate } from '../services/notificationService';
import { format } from 'date-fns';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/leave-documents');
        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req: Request, file, cb) => {
        const user = req.user;
        if (!user) {
            cb(new Error('User not authenticated'), '');
            return;
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only .pdf, .jpg, .jpeg, .png files are allowed'));
        }
    }
});

// Initialize leave balance for new staff
const initializeLeaveBalance = async (staffId: string) => {
    const currentYear = new Date().getFullYear();
    const balance = await LeaveBalance.create({
        staffId: new Types.ObjectId(staffId.toString()),
        year: currentYear,
        totalAnnualLeave: 21, // Default value
        usedAnnualLeave: 0,
        carryOver: 0
    });
    return balance;
};

// Helper function to check if date is in past
const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
};

// Set annual leave days for staff (Manager only)
export const setAnnualLeaveDays = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user || user.role !== 'manager') {
            res.status(403).json({ message: 'Access denied. Managers only.' });
            return;
        }

        const { staffId, days } = req.body;

        const staff = await Staff.findById(staffId);
        if (!staff) {
            res.status(404).json({ message: 'Staff member not found' });
            return;
        }

        if (staff.managerId.toString() !== user.id) {
            res.status(403).json({ message: 'You can only set leave for your own staff members' });
            return;
        }

        const currentYear = new Date().getFullYear();
        const balance = await LeaveBalance.findOneAndUpdate(
            { staffId, year: currentYear },
            { $set: { totalAnnualLeave: days } },
            { new: true, upsert: true }
        );

        res.json({
            message: `Annual leave days set to ${days} for staff member`,
            balance
        });
    } catch (error) {
        console.error('Set annual leave days error:', error);
        res.status(500).json({ message: 'Failed to set annual leave days' });
    }
};

// Get leave balance for a staff member
export const getLeaveBalance = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user || user.role !== 'staff') {
            res.status(403).json({ message: 'Access denied. Staff only.' });
            return;
        }

        const staffId = user.id;
        const currentYear = new Date().getFullYear();

        let balance = await LeaveBalance.findOne({ staffId, year: currentYear });
        if (!balance) {
            balance = await initializeLeaveBalance(staffId);
        }

        const pendingRequests = await Leave.find({
            staffId: new Types.ObjectId(staffId.toString()),
            type: 'annual',
            status: 'pending',
            startDate: { $gte: new Date(currentYear, 0, 1) }
        });

        const pendingAnnualLeave = pendingRequests.reduce((total, request) => total + request.daysRequested, 0);

        res.json({
            ...balance.toObject(),
            pendingAnnualLeave
        });
    } catch (error) {
        console.error('Get leave balance error:', error);
        res.status(500).json({ message: 'Failed to fetch leave balance' });
    }
};

// Submit leave request
export const submitLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user || user.role !== 'staff') {
            res.status(403).json({ message: 'Access denied. Staff only.' });
            return;
        }

        const { type, startDate, endDate, reason } = req.body;
        const staffId = user.id;

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            res.status(400).json({ message: 'End date must be after start date' });
            return;
        }

        if (isPastDate(start)) {
            res.status(400).json({ message: 'Cannot request leave for past dates' });
            return;
        }

        const daysRequested = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const currentYear = new Date().getFullYear();
        let balance = await LeaveBalance.findOne({ staffId, year: currentYear });
        if (!balance) {
            balance = await initializeLeaveBalance(staffId);
        }

        if (type === 'annual' && daysRequested > balance.remainingAnnualLeave) {
            res.status(400).json({
                message: `Insufficient annual leave balance. You have ${balance.remainingAnnualLeave} days remaining.`
            });
            return;
        }

        if (type === 'sick' && !req.file) {
            res.status(400).json({ message: 'Doctor\'s report is required for sick leave' });
            return;
        }

        const overlapping = await Leave.findOne({
            staffId: new Types.ObjectId(staffId.toString()),
            status: { $in: ['pending', 'approved'] },
            $or: [
                { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
        });

        if (overlapping) {
            res.status(400).json({ message: 'You already have a leave request for these dates' });
            return;
        }

        const leaveData: Partial<ILeave> = {
            staffId: new Types.ObjectId(staffId.toString()),
            type: type as 'annual' | 'sick',
            startDate: start,
            endDate: end,
            daysRequested,
            reason,
            status: 'pending'
        };

        if (type === 'sick' && req.file) {
            leaveData.attachments = [`/uploads/leave-documents/${req.file.filename}`];
        }

        const leave = await Leave.create(leaveData);

        const staff = await Staff.findById(staffId);
        if (!staff) {
            res.status(404).json({ message: 'Staff not found' });
            return;
        }

        const manager = await User.findById(staff.managerId);
        if (manager) {
            // Use the new notification service
            await notifyManagerOfLeaveRequest(
                manager.id.toString(),
                manager.email,
                staff.name,
                leave.id.toString(),
                {
                    type: type,
                    daysRequested: daysRequested,
                    startDate: format(new Date(startDate), 'MMMM d, yyyy'),
                    endDate: format(new Date(endDate), 'MMMM d, yyyy')
                }
            );
        }

        await sendEmail({
            to: staff.email,
            subject: 'Leave Request Submitted Successfully',
            template: 'leave_request_submitted',
            context: {
                username: staff.name,
                leaveType: type,
                startDate: start.toLocaleDateString(),
                endDate: end.toLocaleDateString(),
                daysRequested,
                reason,
                remainingBalance: type === 'annual' ? balance.remainingAnnualLeave - daysRequested : 'Unlimited'
            }
        });

        res.status(201).json({
            message: 'Leave request submitted successfully',
            request: leave
        });
    } catch (error) {
        console.error('Submit leave request error:', error);
        res.status(500).json({ message: 'Failed to submit leave request' });
    }
};

// Get staff's leave requests
export const getMyLeaveRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (!user || user.role !== 'staff') {
            res.status(403).json({ message: 'Access denied. Staff only.' });
            return;
        }

        const requests = await Leave.find({ staffId: new Types.ObjectId(user.id.toString()) })
            .populate('reviewedBy', 'name')
            .sort('-submittedAt');

        res.json({ requests });
    } catch (error) {
        console.error('Get leave requests error:', error);
        res.status(500).json({ message: 'Failed to fetch leave requests' });
    }
};

// Manager: Get all leave requests for their organization
export const getAllLeaveRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (!user || user.role !== 'manager') {
            res.status(403).json({ message: 'Access denied. Managers only.' });
            return;
        }

        const staffMembers = await Staff.find({ managerId: new Types.ObjectId(user.id.toString()) });
        const staffIds = staffMembers.map(staff => staff._id);

        const requests = await Leave.find({ staffId: { $in: staffIds } })
            .populate('staffId', 'name email')
            .populate('reviewedBy', 'name')
            .sort('-submittedAt');

        res.json({ requests });
    } catch (error) {
        console.error('Get all leave requests error:', error);
        res.status(500).json({ message: 'Failed to fetch leave requests' });
    }
};

// Manager: Get staff leave balances
export const getStaffBalances = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (!user || user.role !== 'manager') {
            res.status(403).json({ message: 'Access denied. Managers only.' });
            return;
        }

        const currentYear = new Date().getFullYear();

        const staffMembers = await Staff.find({ managerId: new Types.ObjectId(user.id.toString()) });

        const balances = await Promise.all(staffMembers.map(async (member) => {
            let balance = await LeaveBalance.findOne({
                staffId: member.id,
                year: currentYear
            });

            if (!balance) {
                balance = await initializeLeaveBalance(member.id.toString());
            }

            const pendingRequests = await Leave.countDocuments({
                staffId: member._id,
                status: 'pending'
            });

            return {
                staffId: member.id.toString(), // Add staffId
                staffName: member.name,
                ...(balance ? balance.toObject() : {}),
                pendingRequests
            };
        }));

        res.json({ balances });
    } catch (error) {
        console.error('Get staff balances error:', error);
        res.status(500).json({ message: 'Failed to fetch staff balances' });
    }
};

// Manager: Review leave request
export const reviewLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (!user || user.role !== 'manager') {
            res.status(403).json({ message: 'Access denied. Managers only.' });
            return;
        }

        const { id } = req.params;
        const { action, comments, modifiedDates } = req.body;

        const leave = await Leave.findById(id).populate<{ staffId: IStaff }>('staffId');

        if (!leave) {
            res.status(404).json({ message: 'Leave request not found' });
            return;
        }

        const staffMember = leave.staffId as IStaff;
        if (staffMember.managerId.toString() !== user.id) {
            res.status(403).json({ message: 'Access denied. You can only review your staff\'s requests.' });
            return;
        }

        if (leave.status !== 'pending') {
            res.status(400).json({ message: 'This request has already been reviewed' });
            return;
        }

        leave.status = action;
        leave.managerComments = comments;
        leave.reviewedBy = new Types.ObjectId(user.id.toString());
        leave.reviewedAt = new Date();

        if (action === 'modified' && modifiedDates) {
            leave.modifiedDates = {
                startDate: modifiedDates.startDate ? new Date(modifiedDates.startDate) : undefined,
                endDate: modifiedDates.endDate ? new Date(modifiedDates.endDate) : undefined
            };

            if (modifiedDates.startDate && modifiedDates.endDate) {
                leave.daysRequested = leave.calculateDays();
            }
        }

        if (action === 'approved' && leave.type === 'annual') {
            const balance = await LeaveBalance.findOne({
                staffId: leave.staffId,
                year: new Date().getFullYear()
            });

            if (balance) {
                balance.usedAnnualLeave += leave.daysRequested;
                await balance.save();
            }
        }

        await leave.save();

        const manager = await User.findById(user.id);

        // const emailTemplate = action === 'approved' ? 'leave_request_approved' :
        //     action === 'rejected' ? 'leave_request_rejected' : 'leave_request_modified';
        //
        // await sendEmail({
        //     to: staffMember.email,
        //     subject: `Leave Request ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        //     template: emailTemplate,
        //     context: {
        //         username: staffMember.name,
        //         managerName: manager?.name || 'Manager',
        //         leaveType: leave.type,
        //         startDate: leave.startDate.toLocaleDateString(),
        //         endDate: leave.endDate.toLocaleDateString(),
        //         daysRequested: leave.daysRequested,
        //         managerComments: comments,
        //         approvedDate: new Date().toLocaleDateString(),
        //         ...(action === 'modified' && modifiedDates ? {
        //             originalStartDate: leave.startDate.toLocaleDateString(),
        //             originalEndDate: leave.endDate.toLocaleDateString(),
        //             originalDays: leave.daysRequested,
        //             modifiedStartDate: modifiedDates.startDate ? new Date(modifiedDates.startDate).toLocaleDateString() : '',
        //             modifiedEndDate: modifiedDates.endDate ? new Date(modifiedDates.endDate).toLocaleDateString() : '',
        //             modifiedDays: leave.daysRequested
        //         } : {})
        //     }
        // });

        // Use the new notification service instead of the old system
        await notifyStaffOfLeaveUpdate(
            staffMember.id.toString(),
            staffMember.email,
            action as 'approved' | 'rejected' | 'modified',
            leave.id.toString(),
            manager?.name || 'Manager',
            {
                staffName: staffMember.name,
                type: leave.type,
                startDate: leave.startDate.toLocaleDateString(),
                endDate: leave.endDate.toLocaleDateString(),
                daysRequested: leave.daysRequested,
                managerComments: comments
            }
        );

        res.json({
            message: `Leave request ${action} successfully`,
            request: leave
        });
    } catch (error) {
        console.error('Review leave request error:', error);
        res.status(500).json({ message: 'Failed to review leave request' });
    }
};

// Manager: Assign leave to staff
export const assignLeave = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (!user || user.role !== 'manager') {
            res.status(403).json({ message: 'Access denied. Managers only.' });
            return;
        }

        const { staffId, type, startDate, endDate, reason } = req.body;

        const staff = await Staff.findById(staffId);
        if (!staff) {
            res.status(404).json({ message: 'Staff member not found' });
            return;
        }

        if (staff.managerId.toString() !== user.id) {
            res.status(403).json({ message: 'You can only assign leave to your own staff members' });
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const daysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const currentYear = new Date().getFullYear();
        const balance = await LeaveBalance.findOne({
            staffId: new Types.ObjectId(staffId.toString()),
            year: currentYear
        });

        if (!balance) {
            res.status(400).json({ message: 'Leave balance not initialized for this staff member' });
            return;
        }

        if (type === 'annual' && daysRequested > balance.remainingAnnualLeave) {
            res.status(400).json({
                message: `Insufficient annual leave balance. Staff has ${balance.remainingAnnualLeave} days remaining.`
            });
            return;
        }

        const leave = await Leave.create({
            staffId: new Types.ObjectId(staffId.toString()),
            type: type as 'annual' | 'sick',
            startDate: start,
            endDate: end,
            daysRequested,
            reason,
            status: 'approved' as const,
            reviewedBy: new Types.ObjectId(user.id.toString()),
            reviewedAt: new Date(),
            managerComments: 'Leave assigned by manager'
        });

        if (type === 'annual') {
            balance.usedAnnualLeave += daysRequested;
            await balance.save();
        }

        const manager = await User.findById(user.id);

        await sendEmail({
            to: staff.email,
            subject: 'Leave Assigned by Manager',
            template: 'leave_assigned',
            context: {
                username: staff.name,
                managerName: manager?.name || 'Manager',
                leaveType: type,
                startDate: start.toLocaleDateString(),
                endDate: end.toLocaleDateString(),
                daysRequested,
                reason
            }
        });

        res.status(201).json({
            message: 'Leave assigned successfully',
            request: leave
        });
    } catch (error) {
        console.error('Assign leave error:', error);
        res.status(500).json({ message: 'Failed to assign leave' });
    }
};

// Get leave report (Manager only)
export const getLeaveReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (!user || user.role !== 'manager') {
            res.status(403).json({ message: 'Access denied. Managers only.' });
            return;
        }

        const { year = new Date().getFullYear() } = req.query;

        const staffMembers = await Staff.find({ managerId: new Types.ObjectId(user.id.toString()) });
        const staffIds = staffMembers.map(staff => staff._id);

        const yearStart = new Date(Number(year), 0, 1);
        const yearEnd = new Date(Number(year), 11, 31);

        const leaveRequests = await Leave.find({
            staffId: { $in: staffIds },
            startDate: { $gte: yearStart, $lte: yearEnd },
            status: 'approved'
        }).populate<{ staffId: IStaff }>('staffId', 'name');

        const report: Record<string, any> = {};

        leaveRequests.forEach(leave => {
            const staffData = leave.staffId as IStaff;
            const staffName = staffData.name;
            if (!report[staffName]) {
                report[staffName] = {
                    staffId: staffData._id,
                    annual: 0,
                    sick: 0,
                    total: 0
                };
            }

            report[staffName][leave.type] += leave.daysRequested;
            report[staffName].total += leave.daysRequested;
        });

        res.json({ year, report });
    } catch (error) {
        console.error('Get leave report error:', error);
        res.status(500).json({ message: 'Failed to generate leave report' });
    }
};

// Cancel leave request (Staff only)
export const cancelLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (!user || user.role !== 'staff') {
            res.status(403).json({ message: 'Access denied. Staff only.' });
            return;
        }

        const { id } = req.params;

        const leave = await Leave.findById(id);

        if (!leave) {
            res.status(404).json({ message: 'Leave request not found' });
            return;
        }

        if (leave.staffId.toString() !== user.id) {
            res.status(403).json({ message: 'You can only cancel your own leave requests' });
            return;
        }

        if (leave.status !== 'pending') {
            res.status(400).json({ message: 'Only pending requests can be cancelled' });
            return;
        }

        leave.status = 'rejected';
        leave.managerComments = 'Cancelled by staff member';
        leave.reviewedAt = new Date();
        await leave.save();

        res.json({
            message: 'Leave request cancelled successfully',
            request: leave
        });
    } catch (error) {
        console.error('Cancel leave request error:', error);
        res.status(500).json({ message: 'Failed to cancel leave request' });
    }
};

// Get leave statistics for dashboard
export const getLeaveStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (!user) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }

        const currentYear = new Date().getFullYear();

        if (user.role === 'staff') {
            const leaves = await Leave.find({
                staffId: new Types.ObjectId(user.id.toString()),
                startDate: { $gte: new Date(currentYear, 0, 1) }
            });

            const stats = {
                totalRequests: leaves.length,
                pendingRequests: leaves.filter(l => l.status === 'pending').length,
                approvedRequests: leaves.filter(l => l.status === 'approved').length,
                rejectedRequests: leaves.filter(l => l.status === 'rejected').length,
                totalDaysRequested: leaves.reduce((sum, l) => sum + l.daysRequested, 0),
                approvedDays: leaves
                    .filter(l => l.status === 'approved')
                    .reduce((sum, l) => sum + l.daysRequested, 0)
            };

            res.json(stats);
        } else {
            const staffMembers = await Staff.find({ managerId: new Types.ObjectId(user.id.toString()) });
            const staffIds = staffMembers.map(staff => staff._id);

            const leaves = await Leave.find({
                staffId: { $in: staffIds },
                startDate: { $gte: new Date(currentYear, 0, 1) }
            });

            const stats = {
                totalRequests: leaves.length,
                pendingRequests: leaves.filter(l => l.status === 'pending').length,
                approvedRequests: leaves.filter(l => l.status === 'approved').length,
                rejectedRequests: leaves.filter(l => l.status === 'rejected').length,
                totalDaysRequested: leaves.reduce((sum, l) => sum + l.daysRequested, 0),
                approvedDays: leaves
                    .filter(l => l.status === 'approved')
                    .reduce((sum, l) => sum + l.daysRequested, 0),
                staffCount: staffMembers.length
            };

            res.json(stats);
        }
    } catch (error) {
        console.error('Get leave stats error:', error);
        res.status(500).json({ message: 'Failed to fetch leave statistics' });
    }
};

// Export upload middleware
export const uploadDoctorReport = upload.single('doctorReport');