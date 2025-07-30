import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { Leave } from '../models/Leave';
import { Shift } from '../models/Shift';

// Get notifications for the logged-in user
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const filter: any = {
            recipient: user.id,
            recipientModel: user.role === 'manager' ? 'Manager' : 'Staff'
        };

        // Add filter for unread only if requested
        if (req.query.unreadOnly === 'true') {
            filter.read = false;
        }

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Manually populate related documents based on the model type
        for (let notification of notifications) {
            if (notification.relatedTo && notification.relatedTo.id) {
                if (notification.relatedTo.model === 'LeaveRequest') {
                    const leaveRequest = await Leave.findById(notification.relatedTo.id)
                        .populate('staffId', 'name email')
                        .lean();
                    notification.relatedTo.data = leaveRequest;
                } else if (notification.relatedTo.model === 'Shift') {
                    const shift = await Shift.findById(notification.relatedTo.id)
                        .populate('assignedTo', 'name email')
                        .lean();
                    notification.relatedTo.data = shift;
                }
            }
        }

        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({ ...filter, read: false });

        res.json({
            notifications,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total,
                limit
            },
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};



// Mark notification as read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { notificationId } = req.params;

        const notification = await Notification.findOneAndUpdate(
            {
                _id: notificationId,
                recipient: user.id,
                recipientModel: user.role === 'manager' ? 'Manager' : 'Staff'
            },
            {
                read: true,
                readAt: new Date()
            },
            { new: true }
        );

        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.json({ notification });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: 'Failed to mark notification as read' });
    }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        await Notification.updateMany(
            {
                recipient: user.id,
                recipientModel: user.role === 'manager' ? 'Manager' : 'Staff',
                read: false
            },
            {
                read: true,
                readAt: new Date()
            }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
};

// Delete a notification
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const { notificationId } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: user.id,
            recipientModel: user.role === 'manager' ? 'Manager' : 'Staff'
        });

        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
};

// Get unread notification count
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const count = await Notification.countDocuments({
            recipient: user.id,
            recipientModel: user.role === 'manager' ? 'Manager' : 'Staff',
            read: false
        });

        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ message: 'Failed to get unread count' });
    }
};


export const testNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Create a test notification
        const notification = await Notification.create({
            recipient: user.id,
            recipientModel: user.role === 'manager' ? 'Manager' : 'Staff',
            type: 'general',
            title: 'Test Notification',
            message: 'This is a test notification to verify the system is working.',
            read: false
        });

        res.json({
            message: 'Test notification created successfully',
            notification
        });
    } catch (error) {
        console.error('Test notification error:', error);
        res.status(500).json({ message: 'Failed to create test notification' });
    }
};


