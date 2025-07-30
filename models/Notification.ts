import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    recipientModel: 'Staff' | 'Manager';
    type: 'leave_request' | 'leave_approved' | 'leave_rejected' | 'leave_modified' | 'leave_assigned' | 'shift_assigned' | 'shift_updated' | 'general' | 'shift_schedule_created' |
        'account_created' | 'account_activated' | 'account_deleted';
    title: string;
    message: string;
    relatedTo?: {
        model: 'LeaveRequest' | 'Shift';
        id: mongoose.Types.ObjectId;
        data?: any;
    };
    read: boolean;
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
    recipient: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'recipientModel'
    },
    recipientModel: {
        type: String,
        required: true,
        enum: ['Staff', 'Manager']
    },
    type: {
        type: String,
        required: true,
        enum: [
            'leave_request', 'leave_approved', 'leave_rejected', 'leave_modified',
            'leave_assigned', 'shift_assigned', 'shift_updated', 'general',
            'shift_schedule_created', 'account_created', 'account_activated',
            'account_deleted'
        ]
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedTo: {
        model: {
            type: String,
            enum: ['LeaveRequest', 'Shift']
        },
        id: {
            type: Schema.Types.ObjectId,
            refPath: 'relatedTo.model'
        }
    },
    read: {
        type: Boolean,
        default: false
    },
    readAt: Date
}, {
    timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);