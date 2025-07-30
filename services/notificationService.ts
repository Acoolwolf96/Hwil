import { Notification } from '../models/Notification';
import { sendEmail } from '../utils/email';
import mongoose from 'mongoose';

interface CreateNotificationParams {
    recipientId: string;
    recipientModel: 'Staff' | 'Manager';
    type:
    // Leave notifications
        'leave_request' | 'leave_approved' | 'leave_rejected' | 'leave_modified' | 'leave_assigned' |
        // Shift notifications
        'shift_assigned' | 'shift_updated' | 'shift_cancelled' | 'shift_rejected' | 'shift_reminder' |
        'shift_schedule_created' | 'shift_completed' | 'shift_missed' | 'shift_in_progress' |
        // Account notifications
        'welcome_message' | 'password_reset' | 'password_changed' | 'account_created' |
        'email_verification' | 'account_activated' | 'profile_updated' |
        // General notifications
        'general' | 'system_alert' | 'maintenance' | 'announcement';
    title: string;
    message: string;
    relatedTo?: {
        model: 'LeaveRequest' | 'Shift' | 'User' | 'Staff';
        id: string;
    };
    emailData?: {
        to: string;
        subject: string;
        template: any;
        context: any;
    };
}

export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
    try {
        // Create the notification
        const notification = await Notification.create({
            recipient: new mongoose.Types.ObjectId(params.recipientId),
            recipientModel: params.recipientModel,
            type: params.type,
            title: params.title,
            message: params.message,
            relatedTo: params.relatedTo ? {
                model: params.relatedTo.model,
                id: new mongoose.Types.ObjectId(params.relatedTo.id)
            } : undefined
        });

        console.log('Notification created:', notification);

        // Send email notification if email data is provided
        if (params.emailData) {
            await sendEmail({
                to: params.emailData.to,
                subject: params.emailData.subject,
                template: params.emailData.template,
                context: params.emailData.context
            });
        }
    } catch (error) {
        console.error('Create notification error:', error);
        throw error;
    }
};

// LEAVE NOTIFICATION FUNCTIONS (existing)
export const notifyManagerOfLeaveRequest = async (
    managerId: string,
    managerEmail: string,
    staffName: string,
    leaveRequestId: string,
    leaveDetails: any
) => {
    await createNotification({
        recipientId: managerId,
        recipientModel: 'Manager',
        type: 'leave_request',
        title: 'New Leave Request',
        message: `${staffName} has submitted a ${leaveDetails.type} leave request for ${leaveDetails.daysRequested} days (${leaveDetails.startDate} to ${leaveDetails.endDate})`,
        relatedTo: {
            model: 'LeaveRequest',
            id: leaveRequestId
        },
        emailData: {
            to: managerEmail,
            subject: 'New Leave Request Requires Your Attention',
            template: 'new_leave_request',
            context: {
                managerName: 'Manager',
                staffName: staffName,
                leaveType: leaveDetails.type,
                startDate: leaveDetails.startDate,
                endDate: leaveDetails.endDate,
                daysRequested: leaveDetails.daysRequested,
                remainingBalance: leaveDetails.remainingBalance,
                reviewLink: `${process.env.FRONTEND_URL}/manager/leave-requests`
            }
        }
    });
};

export const notifyStaffOfLeaveUpdate = async (
    staffId: string,
    staffEmail: string,
    status: 'approved' | 'rejected' | 'modified',
    leaveRequestId: string,
    managerName: string,
    leaveDetails: {
        staffName: string;
        type: string;
        startDate: string;
        endDate: string;
        daysRequested: number;
        managerComments?: string;
    }
) => {
    const titles = {
        approved: 'Leave Request Approved',
        rejected: 'Leave Request Rejected',
        modified: 'Leave Request Modified'
    };

    const messages = {
        approved: `Your leave request has been approved by ${managerName}`,
        rejected: `Your leave request has been rejected by ${managerName}`,
        modified: `Your leave request has been modified by ${managerName}`
    };

    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: `leave_${status}` as any,
        title: titles[status],
        message: messages[status],
        relatedTo: {
            model: 'LeaveRequest',
            id: leaveRequestId
        },
        emailData: {
            to: staffEmail,
            subject: titles[status],
            template: 'leave_status_update',
            context: {
                username: leaveDetails.staffName,
                status: status,
                leaveType: leaveDetails.type,
                startDate: leaveDetails.startDate,
                endDate: leaveDetails.endDate,
                daysRequested: leaveDetails.daysRequested,
                managerComments: leaveDetails.managerComments,
                approvedDate: new Date().toDateString()
            }
        }
    });
};

// SHIFT NOTIFICATION FUNCTIONS
export const notifyStaffOfShiftAssignment = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    shiftId: string,
    shiftDetails: any
) => {
    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'shift_assigned',
        title: 'New Shift Assigned',
        message: `You have been assigned a new shift on ${shiftDetails.date} from ${shiftDetails.startTime} to ${shiftDetails.endTime}`,
        relatedTo: {
            model: 'Shift',
            id: shiftId
        },
        emailData: {
            to: staffEmail,
            subject: 'New Shift Assignment',
            template: 'shift_schedule_created',
            context: {
                username: staffName,
                shifts: [{
                    date: shiftDetails.date,
                    startTime: shiftDetails.startTime,
                    endTime: shiftDetails.endTime,
                    location: shiftDetails.location,
                    notes: shiftDetails.notes
                }]
            }
        }
    });
};

export const notifyStaffOfMultipleShifts = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    shifts: any[]
) => {
    const shiftCount = shifts.length;
    const dateRange = shiftCount > 1 ?
        `${shifts[0].date} to ${shifts[shiftCount - 1].date}` :
        shifts[0].date;

    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'shift_schedule_created',
        title: `${shiftCount} New Shift${shiftCount > 1 ? 's' : ''} Assigned`,
        message: `You have ${shiftCount} new shift${shiftCount > 1 ? 's' : ''} scheduled for ${dateRange}`,
        emailData: {
            to: staffEmail,
            subject: `New Shift Schedule - ${shiftCount} Shift${shiftCount > 1 ? 's' : ''}`,
            template: 'shift_schedule_created',
            context: {
                username: staffName,
                shifts: shifts.map(shift => ({
                    date: shift.date,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    location: shift.location,
                    notes: shift.notes
                }))
            }
        }
    });
};

export const notifyStaffOfShiftUpdate = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    shiftId: string,
    oldShiftDetails: any,
    newShiftDetails: any
) => {
    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'shift_updated',
        title: 'Shift Updated',
        message: `Your shift on ${newShiftDetails.date} has been updated`,
        relatedTo: {
            model: 'Shift',
            id: shiftId
        },
        emailData: {
            to: staffEmail,
            subject: 'Shift Schedule Updated',
            template: 'shift_updated',
            context: {
                username: staffName,
                shifts: [{
                    oldDate: oldShiftDetails.date,
                    newDate: newShiftDetails.date,
                    oldStartTime: oldShiftDetails.startTime,
                    newStartTime: newShiftDetails.startTime,
                    oldEndTime: oldShiftDetails.endTime,
                    newEndTime: newShiftDetails.endTime,
                    oldLocation: oldShiftDetails.location,
                    newLocation: newShiftDetails.location
                }]
            }
        }
    });
};

export const notifyStaffOfShiftCancellation = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    shiftId: string,
    shiftDetails: any,
    reason?: string
) => {
    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'shift_cancelled',
        title: 'Shift Cancelled',
        message: `Your shift on ${shiftDetails.date} from ${shiftDetails.startTime} to ${shiftDetails.endTime} has been cancelled`,
        relatedTo: {
            model: 'Shift',
            id: shiftId
        },
        emailData: {
            to: staffEmail,
            subject: 'Shift Cancellation Notice',
            template: 'shift_cancelled',
            context: {
                username: staffName,
                date: shiftDetails.date,
                startTime: shiftDetails.startTime,
                endTime: shiftDetails.endTime,
                location: shiftDetails.location,
                reason: reason
            }
        }
    });
};

export const notifyStaffOfShiftRejection = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    shiftId: string,
    shiftDetails: any,
    managerName: string,
    reason: string
) => {
    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'shift_rejected',
        title: 'Shift Submission Requires Revision',
        message: `Your shift submission for ${shiftDetails.date} requires revision`,
        relatedTo: {
            model: 'Shift',
            id: shiftId
        },
        emailData: {
            to: staffEmail,
            subject: 'Shift Submission Requires Revision',
            template: 'shift_rejected',
            context: {
                username: staffName,
                date: shiftDetails.date,
                startTime: shiftDetails.startTime,
                endTime: shiftDetails.endTime,
                managerName: managerName,
                reason: reason
            }
        }
    });
};

export const notifyStaffOfShiftReminder = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    shiftId: string,
    shiftDetails: any
) => {
    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'shift_reminder',
        title: 'Upcoming Shift Reminder',
        message: `Reminder: You have a shift tomorrow on ${shiftDetails.date} from ${shiftDetails.startTime} to ${shiftDetails.endTime}`,
        relatedTo: {
            model: 'Shift',
            id: shiftId
        },
        emailData: {
            to: staffEmail,
            subject: 'Upcoming Shift Reminder',
            template: 'shift_reminder',
            context: {
                username: staffName,
                date: shiftDetails.date,
                startTime: shiftDetails.startTime,
                endTime: shiftDetails.endTime,
                location: shiftDetails.location
            }
        }
    });
};

// WELCOME MESSAGE NOTIFICATIONS
export const notifyManagerWelcome = async (
    managerId: string,
    managerEmail: string,
    managerName: string,
    organizationName: string
) => {
    await createNotification({
        recipientId: managerId,
        recipientModel: 'Manager',
        type: 'welcome_message',
        title: 'Welcome to Hwil!',
        message: `Welcome ${managerName}! Your manager account has been created successfully. Please verify your email to get started.`,
        emailData: {
            to: managerEmail,
            subject: 'Welcome to Hwil - Account Created Successfully',
            template: 'welcome_email',
            context: {
                username: managerName,
                organizationName: organizationName
            }
        }
    });
};

export const notifyStaffWelcome = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    organizationName: string,
    verificationLink: string
) => {
    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'welcome_message',
        title: 'Welcome to the Team!',
        message: `Welcome ${staffName}! You've been invited to join ${organizationName}. Please verify your email to access your account.`,
        emailData: {
            to: staffEmail,
            subject: `Welcome to ${organizationName} - Verify Your Account`,
            template: 'verify_email_staff',
            context: {
                username: staffName,
                Organization: organizationName,
                verificationLink: verificationLink
            }
        }
    });
};

export const notifyStaffRegistrationSuccess = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    organizationName: string
) => {
    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'account_created',
        title: 'Registration Successful',
        message: `Your account has been created successfully! Welcome to ${organizationName}.`,
        emailData: {
            to: staffEmail,
            subject: 'Registration Successful - Welcome!',
            template: 'staff_registration_success',
            context: {
                username: staffName,
                Organization: organizationName
            }
        }
    });
};

// PASSWORD RESET NOTIFICATIONS
export const notifyPasswordResetRequest = async (
    userId: string,
    userEmail: string,
    userName: string,
    userRole: 'Staff' | 'Manager',
    resetLink: string
) => {
    await createNotification({
        recipientId: userId,
        recipientModel: userRole,
        type: 'password_reset',
        title: 'Password Reset Requested',
        message: 'You have requested to reset your password. Click the link in your email to proceed.',
        emailData: {
            to: userEmail,
            subject: 'Reset Your Hwil Password',
            template: 'reset_password',
            context: {
                username: userName,
                resetLink: resetLink
            }
        }
    });
};

export const notifyPasswordResetSuccess = async (
    userId: string,
    userEmail: string,
    userName: string,
    userRole: 'Staff' | 'Manager'
) => {
    await createNotification({
        recipientId: userId,
        recipientModel: userRole,
        type: 'password_changed',
        title: 'Password Successfully Reset',
        message: 'Your password has been successfully reset. If you did not make this change, please contact support immediately.',
        emailData: {
            to: userEmail,
            subject: 'Password Reset Confirmation',
            template: 'notification_alert',
            context: {
                title: 'Password Successfully Reset',
                message: 'Your password has been successfully reset. If you did not make this change, please contact support immediately.',
                actionUrl: `${process.env.FRONTEND_URL}/login`
            }
        }
    });
};

// PASSWORD CHANGE NOTIFICATIONS
export const notifyPasswordChanged = async (
    userId: string,
    userEmail: string,
    userName: string,
    userRole: 'Staff' | 'Manager'
) => {
    await createNotification({
        recipientId: userId,
        recipientModel: userRole,
        type: 'password_changed',
        title: 'Password Changed',
        message: 'Your account password has been successfully changed.',
        emailData: {
            to: userEmail,
            subject: 'Password Changed Successfully',
            template: 'notification_alert',
            context: {
                title: 'Password Changed Successfully',
                message: `Hi ${userName}, your account password has been successfully changed. If you did not make this change, please contact support immediately.`,
                actionUrl: `${process.env.FRONTEND_URL}/profile/security`
            }
        }
    });
};

// EMAIL VERIFICATION NOTIFICATIONS
export const notifyEmailVerification = async (
    userId: string,
    userEmail: string,
    userName: string,
    userRole: 'Staff' | 'Manager',
    verificationLink: string,
    isManager: boolean = false
) => {
    await createNotification({
        recipientId: userId,
        recipientModel: userRole,
        type: 'email_verification',
        title: 'Email Verification Required',
        message: 'Please verify your email address to complete your account setup.',
        emailData: {
            to: userEmail,
            subject: 'Verify Your Email Address',
            template: isManager ? 'verify_email' : 'verify_email_staff',
            context: {
                username: userName,
                verificationLink: verificationLink,
                Organization: isManager ? undefined : 'Your Organization'
            }
        }
    });
};

// ACCOUNT ACTIVATION NOTIFICATION
export const notifyAccountActivated = async (
    userId: string,
    userEmail: string,
    userName: string,
    userRole: 'Staff' | 'Manager'
) => {
    await createNotification({
        recipientId: userId,
        recipientModel: userRole,
        type: 'account_activated',
        title: 'Account Activated',
        message: 'Your email has been verified and your account is now active!',
        emailData: {
            to: userEmail,
            subject: 'Account Activated Successfully',
            template: 'notification_alert',
            context: {
                title: 'Account Activated Successfully',
                message: `Hi ${userName}, your email has been verified and your account is now active! You can now access all features.`,
                actionUrl: `${process.env.FRONTEND_URL}/dashboard`
            }
        }
    });
};

// ACCOUNT DELETION NOTIFICATION
export const notifyAccountDeleted = async (
    userEmail: string,
    userName: string,
    organizationName: string
) => {
    // Note: No in-app notification since account is deleted
    await sendEmail({
        to: userEmail,
        subject: 'Account Deletion Confirmation',
        template: 'account_deleted',
        context: {
            username: userName,
            organizationName: organizationName
        }
    });
};

// SYSTEM NOTIFICATIONS
export const notifySystemMaintenance = async (
    userId: string,
    userEmail: string,
    userName: string,
    userRole: 'Staff' | 'Manager',
    maintenanceDetails: any
) => {
    await createNotification({
        recipientId: userId,
        recipientModel: userRole,
        type: 'maintenance',
        title: 'Scheduled Maintenance',
        message: `System maintenance is scheduled for ${maintenanceDetails.date} from ${maintenanceDetails.startTime} to ${maintenanceDetails.endTime}`,
        emailData: {
            to: userEmail,
            subject: 'Scheduled System Maintenance',
            template: 'notification_alert',
            context: {
                title: 'Scheduled System Maintenance',
                message: `Hi ${userName}, we have scheduled system maintenance on ${maintenanceDetails.date} from ${maintenanceDetails.startTime} to ${maintenanceDetails.endTime}. The system will be temporarily unavailable during this time.`,
                actionUrl: `${process.env.FRONTEND_URL}/notifications`
            }
        }
    });
};

export const notifyGeneralAnnouncement = async (
    userId: string,
    userEmail: string,
    userName: string,
    userRole: 'Staff' | 'Manager',
    announcement: any
) => {
    await createNotification({
        recipientId: userId,
        recipientModel: userRole,
        type: 'announcement',
        title: announcement.title,
        message: announcement.message,
        emailData: {
            to: userEmail,
            subject: `Announcement: ${announcement.title}`,
            template: 'notification_alert',
            context: {
                title: announcement.title,
                message: announcement.message,
                actionUrl: `${process.env.FRONTEND_URL}/announcements`
            }
        }
    });
};

// BULK NOTIFICATION FUNCTIONS
export const notifyMultipleStaffOfShifts = async (
    staffList: Array<{
        staffId: string;
        staffEmail: string;
        staffName: string;
        shifts: any[];
    }>
) => {
    const notifications = staffList.map(staff =>
        notifyStaffOfMultipleShifts(
            staff.staffId,
            staff.staffEmail,
            staff.staffName,
            staff.shifts
        )
    );

    await Promise.all(notifications);
};

export const notifyAllStaffOfAnnouncement = async (
    staffList: Array<{
        staffId: string;
        staffEmail: string;
        staffName: string;
        role: 'Staff' | 'Manager';
    }>,
    announcement: any
) => {
    const notifications = staffList.map(staff =>
        notifyGeneralAnnouncement(
            staff.staffId,
            staff.staffEmail,
            staff.staffName,
            staff.role,
            announcement
        )
    );

    await Promise.all(notifications);
};

// PROFILE UPDATE NOTIFICATIONS
export const notifyProfileUpdated = async (
    userId: string,
    userEmail: string,
    userName: string,
    userRole: 'Staff' | 'Manager',
    updatedFields: string[]
) => {
    await createNotification({
        recipientId: userId,
        recipientModel: userRole,
        type: 'profile_updated',
        title: 'Profile Updated',
        message: `Your profile has been updated. Changes made to: ${updatedFields.join(', ')}`,
        emailData: {
            to: userEmail,
            subject: 'Profile Update Confirmation',
            template: 'notification_alert',
            context: {
                title: 'Profile Updated Successfully',
                message: `Hi ${userName}, your profile has been updated successfully. The following fields were changed: ${updatedFields.join(', ')}.`,
                actionUrl: `${process.env.FRONTEND_URL}/profile`
            }
        }
    });
};

// PERMISSION UPDATE NOTIFICATIONS
export const notifyPermissionUpdated = async (
    userId: string,
    userEmail: string,
    userName: string,
    userRole: 'Staff' | 'Manager'
) => {
    await createNotification({
        recipientId: userId,
        recipientModel: userRole,
        type: 'general',
        title: 'Account Permissions Updated',
        message: 'Your account permissions have been updated by your administrator.',
        emailData: {
            to: userEmail,
            subject: 'Account Permissions Updated',
            template: 'permission_updated',
            context: {
                username: userName
            }
        }
    });
};

// SHIFT STATUS NOTIFICATIONS
export const notifyShiftCompleted = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    shiftId: string,
    shiftDetails: any
) => {
    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'shift_completed',
        title: 'Shift Completed',
        message: `Your shift on ${shiftDetails.date} has been marked as completed`,
        relatedTo: {
            model: 'Shift',
            id: shiftId
        },
        emailData: {
            to: staffEmail,
            subject: 'Shift Completion Confirmation',
            template: 'notification_alert',
            context: {
                title: 'Shift Completed',
                message: `Hi ${staffName}, your shift on ${shiftDetails.date} from ${shiftDetails.startTime} to ${shiftDetails.endTime} has been successfully completed.`,
                actionUrl: `${process.env.FRONTEND_URL}/staff/shifts`
            }
        }
    });
};

export const notifyShiftMissed = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    shiftId: string,
    shiftDetails: any
) => {
    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'shift_missed',
        title: 'Missed Shift Alert',
        message: `You missed your scheduled shift on ${shiftDetails.date}`,
        relatedTo: {
            model: 'Shift',
            id: shiftId
        },
        emailData: {
            to: staffEmail,
            subject: 'Missed Shift Notification',
            template: 'notification_alert',
            context: {
                title: 'Missed Shift Alert',
                message: `Hi ${staffName}, our records show that you missed your scheduled shift on ${shiftDetails.date} from ${shiftDetails.startTime} to ${shiftDetails.endTime}. Please contact your manager if this is incorrect.`,
                actionUrl: `${process.env.FRONTEND_URL}/staff/shifts`
            }
        }
    });
};

export const notifyShiftInProgress = async (
    staffId: string,
    staffEmail: string,
    staffName: string,
    shiftId: string,
    shiftDetails: any
) => {
    await createNotification({
        recipientId: staffId,
        recipientModel: 'Staff',
        type: 'shift_in_progress',
        title: 'Shift Started',
        message: `Your shift has started. Clock in time: ${shiftDetails.clockInTime}`,
        relatedTo: {
            model: 'Shift',
            id: shiftId
        }
        // Note: Usually no email needed for shift start, just in-app notification
    });
};

// MANAGER NOTIFICATIONS FOR SHIFT EVENTS
export const notifyManagerOfShiftEvent = async (
    managerId: string,
    managerEmail: string,
    managerName: string,
    staffName: string,
    eventType: 'missed' | 'completed' | 'late' | 'early_departure',
    shiftDetails: any
) => {
    const eventTitles = {
        missed: 'Staff Member Missed Shift',
        completed: 'Shift Completed',
        late: 'Staff Member Late for Shift',
        early_departure: 'Staff Member Left Early'
    };

    const eventMessages = {
        missed: `${staffName} missed their scheduled shift on ${shiftDetails.date}`,
        completed: `${staffName} completed their shift on ${shiftDetails.date}`,
        late: `${staffName} was late for their shift on ${shiftDetails.date}`,
        early_departure: `${staffName} left early from their shift on ${shiftDetails.date}`
    };

    await createNotification({
        recipientId: managerId,
        recipientModel: 'Manager',
        type: 'general',
        title: eventTitles[eventType],
        message: eventMessages[eventType],
        emailData: {
            to: managerEmail,
            subject: `Staff Alert: ${eventTitles[eventType]}`,
            template: 'notification_alert',
            context: {
                title: eventTitles[eventType],
                message: `Hi ${managerName}, ${eventMessages[eventType]} from ${shiftDetails.startTime} to ${shiftDetails.endTime}.`,
                actionUrl: `${process.env.FRONTEND_URL}/manager/shifts`
            }
        }
    });
};

// INVITATION NOTIFICATIONS
export const notifyStaffInvitation = async (
    staffEmail: string,
    staffName: string,
    organizationName: string,
    inviteLink: string
) => {
    // Note: No in-app notification since user doesn't have account yet
    await sendEmail({
        to: staffEmail,
        subject: `You're Invited to Join ${organizationName}`,
        template: 'invite_staff',
        context: {
            username: staffName,
            Organization: organizationName,
            inviteLink: inviteLink
        }
    });
};

// UTILITY FUNCTIONS
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    try {
        await Notification.findByIdAndUpdate(
            notificationId,
            {
                read: true,
                readAt: new Date()
            }
        );
    } catch (error) {
        console.error('Mark notification as read error:', error);
        throw error;
    }
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    try {
        await Notification.updateMany(
            {
                recipient: new mongoose.Types.ObjectId(userId),
                read: false
            },
            {
                read: true,
                readAt: new Date()
            }
        );
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        throw error;
    }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
        await Notification.findByIdAndDelete(notificationId);
    } catch (error) {
        console.error('Delete notification error:', error);
        throw error;
    }
};

export const deleteMultipleNotifications = async (notificationIds: string[]): Promise<void> => {
    try {
        await Notification.deleteMany({
            _id: { $in: notificationIds.map(id => new mongoose.Types.ObjectId(id)) }
        });
    } catch (error) {
        console.error('Delete multiple notifications error:', error);
        throw error;
    }
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
    try {
        const count = await Notification.countDocuments({
            recipient: new mongoose.Types.ObjectId(userId),
            read: false
        });
        return count;
    } catch (error) {
        console.error('Get unread notification count error:', error);
        throw error;
    }
};

// SCHEDULED NOTIFICATION FUNCTIONS (for cron jobs or background tasks)
export const sendShiftReminders = async (): Promise<void> => {
    try {
        // This would typically be called by a cron job
        // Find shifts scheduled for tomorrow and send reminders
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Implementation would depend on your Shift model structure
        // This is a placeholder for the logic
        console.log('Sending shift reminders for', tomorrow.toDateString());
    } catch (error) {
        console.error('Send shift reminders error:', error);
        throw error;
    }
};

export const cleanupOldNotifications = async (daysOld: number = 30): Promise<void> => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        await Notification.deleteMany({
            createdAt: { $lt: cutoffDate },
            read: true
        });

        console.log(`Cleaned up notifications older than ${daysOld} days`);
    } catch (error) {
        console.error('Cleanup old notifications error:', error);
        throw error;
    }
};

// ERROR NOTIFICATION FUNCTIONS
export const notifySystemError = async (
    adminIds: string[],
    adminEmails: string[],
    errorDetails: any
): Promise<void> => {
    const notifications = adminIds.map((adminId, index) =>
        createNotification({
            recipientId: adminId,
            recipientModel: 'Manager', // Assuming admins are managers
            type: 'system_alert',
            title: 'System Error Alert',
            message: `A system error has occurred: ${errorDetails.message}`,
            emailData: {
                to: adminEmails[index],
                subject: 'System Error Alert - Immediate Attention Required',
                template: 'notification_alert',
                context: {
                    title: 'System Error Alert',
                    message: `A system error has occurred that requires immediate attention. Error: ${errorDetails.message}. Time: ${new Date().toISOString()}`,
                    actionUrl: `${process.env.FRONTEND_URL}/admin/system`
                }
            }
        })
    );

    await Promise.all(notifications);
};

// BATCH NOTIFICATION FUNCTIONS
export const sendBatchNotifications = async (
    notifications: CreateNotificationParams[]
): Promise<void> => {
    try {
        const batchPromises = notifications.map(notification =>
            createNotification(notification)
        );

        await Promise.all(batchPromises);
        console.log(`Successfully sent ${notifications.length} batch notifications`);
    } catch (error) {
        console.error('Send batch notifications error:', error);
        throw error;
    }
};
