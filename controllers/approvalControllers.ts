import { Request, Response } from 'express';
import { Leave } from '../models/Leave';
import { Shift } from '../models/Shift';
import { Types } from 'mongoose';

export interface ApprovalItem {
    _id: string;
    type: 'leave' | 'shift' | 'overtime' | 'expense';
    status: 'pending' | 'approved' | 'rejected' | 'modified';
    title: string;
    description: string;
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: {
        _id: string;
        name: string;
    };
    managerComments?: string;
    details: any;
}

// Helper function to map shift status to approval status
const mapShiftStatusToApprovalStatus = (shiftStatus: string, approvalStatus?: string): 'pending' | 'approved' | 'rejected' | 'modified' => {
    // Use ApprovalStatus if available, otherwise map from shift status
    if (approvalStatus) {
        return approvalStatus as 'pending' | 'approved' | 'rejected';
    }

    switch (shiftStatus) {
        case 'assigned':
        case 'in-progress':
            return 'approved';
        case 'completed':
            return 'approved';
        case 'cancelled':
            return 'rejected';
        case 'open':
            return 'pending';
        default:
            return 'pending';
    }
};

// Get all approvals for a staff member
export const getStaffApprovals = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user || user.role !== 'staff') {
            res.status(403).json({ message: 'Access denied. Staff only.' });
            return;
        }

        const staffId = new Types.ObjectId(user.id);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const type = req.query.type as string;
        const skip = (page - 1) * limit;

        // Build filters
        const leaveFilter: any = { staffId };
        const shiftFilter: any = { assignedTo: staffId };

        if (status && status !== 'all') {
            leaveFilter.status = status;
            // For shifts, we need to handle the status mapping
            if (status === 'pending') {
                shiftFilter.$or = [
                    { ApprovalStatus: 'pending' },
                    { status: 'open' }
                ];
            } else if (status === 'approved') {
                shiftFilter.$or = [
                    { ApprovalStatus: 'approved' },
                    { status: { $in: ['assigned', 'completed', 'in-progress'] } }
                ];
            } else if (status === 'rejected') {
                shiftFilter.$or = [
                    { ApprovalStatus: 'rejected' },
                    { status: 'cancelled' }
                ];
            }
        }

        // Fetch leaves and shifts in parallel
        const [leaves, shifts, leaveCount, shiftCount] = await Promise.all([
            Leave.find(leaveFilter)
                .populate('reviewedBy', 'name')
                .sort({ submittedAt: -1 })
                .skip(type === 'shift' ? 0 : skip)
                .limit(type === 'shift' ? 0 : limit)
                .lean(),
            Shift.find(shiftFilter)
                .populate('createdBy', 'name organizationName')
                .sort({ createdAt: -1 })
                .skip(type === 'leave' ? 0 : skip)
                .limit(type === 'leave' ? 0 : limit)
                .lean(),
            type === 'shift' ? 0 : Leave.countDocuments(leaveFilter),
            type === 'leave' ? 0 : Shift.countDocuments(shiftFilter)
        ]);

        // Transform leaves into approval items
        const leaveApprovals: ApprovalItem[] = type !== 'shift' ? leaves.map(leave => ({
            _id: leave._id.toString(),
            type: 'leave' as const,
            status: leave.status,
            title: `${leave.type.charAt(0).toUpperCase() + leave.type.slice(1)} Leave Request`,
            description: `${leave.daysRequested} days - ${leave.reason}`,
            submittedAt: leave.submittedAt,
            reviewedAt: leave.reviewedAt,
            reviewedBy: leave.reviewedBy as any,
            managerComments: leave.managerComments,
            details: {
                leaveType: leave.type,
                startDate: leave.startDate,
                endDate: leave.endDate,
                daysRequested: leave.daysRequested,
                reason: leave.reason,
                attachments: leave.attachments,
                modifiedDates: leave.modifiedDates
            }
        })) : [];

        // Transform shifts into approval items
        const shiftApprovals: ApprovalItem[] = type !== 'leave' ? shifts.map(shift => ({
            _id: shift._id.toString(),
            type: 'shift' as const,
            status: mapShiftStatusToApprovalStatus(shift.status, shift.ApprovalStatus),
            title: `Shift Assignment - ${shift.name}`,
            description: `${shift.date} - ${shift.startTime} to ${shift.endTime}`,
            submittedAt: shift.createdAt,
            reviewedAt: shift.updatedAt,
            reviewedBy: shift.createdBy ? {
                _id: shift.createdBy._id?.toString() || shift.createdBy.toString(),
                name: (shift.createdBy as any).name || 'Unknown'
            } : undefined,
            managerComments: shift.notes,
            details: {
                name: shift.name,
                date: shift.date,
                startTime: shift.startTime,
                endTime: shift.endTime,
                role: shift.role,
                location: shift.location,
                notes: shift.notes,
                status: shift.status,
                approvalStatus: shift.ApprovalStatus,
                clockInTime: shift.clockInTime,
                clockOutTime: shift.clockOutTime,
                workedHours: shift.workedHours
            }
        })) : [];

        // Combine and sort all approvals
        let allApprovals = [...leaveApprovals, ...shiftApprovals];

        // Filter by type if specified
        if (type && type !== 'all') {
            allApprovals = allApprovals.filter(approval => approval.type === type);
        }

        // Sort by date
        allApprovals.sort((a, b) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );

        // Apply pagination to combined results if no type filter
        if (!type || type === 'all') {
            const startIndex = skip;
            const endIndex = startIndex + limit;
            allApprovals = allApprovals.slice(startIndex, endIndex);
        }

        const totalCount = leaveCount + shiftCount;

        // Calculate statistics from the full dataset
        const [allLeaves, allShifts] = await Promise.all([
            Leave.find({ staffId }).lean(),
            Shift.find({ assignedTo: staffId }).lean()
        ]);

        const allItems = [
            ...allLeaves.map(leave => ({ ...leave, type: 'leave' as const })),
            ...allShifts.map(shift => ({
                ...shift,
                type: 'shift' as const,
                status: mapShiftStatusToApprovalStatus(shift.status, shift.ApprovalStatus)
            }))
        ];

        const stats = {
            total: totalCount,
            pending: allItems.filter(item =>
                item.type === 'leave' ? item.status === 'pending' :
                    mapShiftStatusToApprovalStatus(item.status, (item as any).ApprovalStatus) === 'pending'
            ).length,
            approved: allItems.filter(item =>
                item.type === 'leave' ? item.status === 'approved' :
                    mapShiftStatusToApprovalStatus(item.status, (item as any).ApprovalStatus) === 'approved'
            ).length,
            rejected: allItems.filter(item =>
                item.type === 'leave' ? item.status === 'rejected' :
                    mapShiftStatusToApprovalStatus(item.status, (item as any).ApprovalStatus) === 'rejected'
            ).length,
            modified: allItems.filter(item =>
                item.type === 'leave' ? item.status === 'modified' : false
            ).length
        };

        res.json({
            approvals: allApprovals,
            pagination: {
                current: page,
                pages: Math.ceil(totalCount / limit),
                total: totalCount,
                limit
            },
            stats
        });
    } catch (error) {
        console.error('Get staff approvals error:', error);
        res.status(500).json({ message: 'Failed to fetch approvals' });
    }
};

// Get approval statistics for dashboard
export const getApprovalStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user || user.role !== 'staff') {
            res.status(403).json({ message: 'Access denied. Staff only.' });
            return;
        }

        const staffId = new Types.ObjectId(user.id);
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(currentYear, 0, 1);

        const [
            totalLeaves,
            pendingLeaves,
            approvedLeaves,
            rejectedLeaves,
            totalShifts,
            upcomingShifts
        ] = await Promise.all([
            Leave.countDocuments({ staffId }),
            Leave.countDocuments({ staffId, status: 'pending' }),
            Leave.countDocuments({ staffId, status: 'approved', startDate: { $gte: yearStart } }),
            Leave.countDocuments({ staffId, status: 'rejected', submittedAt: { $gte: yearStart } }),
            Shift.countDocuments({ assignedTo: staffId }),
            Shift.countDocuments({
                assignedTo: staffId,
                date: { $gte: new Date() }
            })
        ]);

        res.json({
            leaves: {
                total: totalLeaves,
                pending: pendingLeaves,
                approved: approvedLeaves,
                rejected: rejectedLeaves
            },
            shifts: {
                total: totalShifts,
                upcoming: upcomingShifts
            },
            summary: {
                totalPending: pendingLeaves,
                totalApproved: approvedLeaves + totalShifts,
                totalRejected: rejectedLeaves
            }
        });
    } catch (error) {
        console.error('Get approval stats error:', error);
        res.status(500).json({ message: 'Failed to fetch approval statistics' });
    }
};