import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveBalance extends Document {
    staffId: mongoose.Types.ObjectId;
    year: number;
    totalAnnualLeave: number;
    usedAnnualLeave: number;
    carryOver: number;
    createdAt: Date;
    updatedAt: Date;
    remainingAnnualLeave: number;
}

const LeaveBalanceSchema: Schema<ILeaveBalance> = new Schema(
    {
        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
            required: true,
            unique: true,
        },
        year: {
            type: Number,
            required: true,
            default: () => new Date().getFullYear(),
        },
        totalAnnualLeave: {
            type: Number,
            default: 0,
        },
        usedAnnualLeave: {
            type: Number,
            default: 0,
        },
        carryOver: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

LeaveBalanceSchema.virtual('remainingAnnualLeave').get(function (this: ILeaveBalance) {
    return this.totalAnnualLeave + this.carryOver - this.usedAnnualLeave;
});

export const LeaveBalance = mongoose.model<ILeaveBalance>('LeaveBalance', LeaveBalanceSchema);