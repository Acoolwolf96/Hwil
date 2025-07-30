import mongoose, { Schema, Document } from 'mongoose';

export type LeaveType = 'annual' | 'sick';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'modified';

export interface ILeave extends Document {
    staffId: mongoose.Types.ObjectId;
    type: LeaveType;
    startDate: Date;
    endDate: Date;
    daysRequested: number;
    reason: string;
    status: LeaveStatus;
    attachments?: string[];
    managerComments?: string;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    modifiedDates?: {
        startDate?: Date;
        endDate?: Date;
    };
    submittedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    calculateDays(): number;
}

const LeaveSchema: Schema<ILeave> = new Schema(
    {
        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
        },
        type: {
            type: String,
            enum: ['annual', 'sick'],
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        daysRequested: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'approved', 'rejected', 'modified'],
            default: 'pending',
        },
        attachments: [{
            type: String,
        }],
        managerComments: {
            type: String,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: {
            type: Date,
        },
        modifiedDates: {
            startDate: Date,
            endDate: Date,
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

LeaveSchema.methods.calculateDays = function (): number {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
};

export const Leave = mongoose.model<ILeave>('Leave', LeaveSchema);