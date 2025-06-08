import mongoose, { Schema, Document } from 'mongoose';


export interface IShift extends Document {
    name: string;
  organizationId: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
    endTime: string;
    role?: string;
    location?: string;
    status: "assigned" | "open" | "completed" | "cancelled" | "missed" | "in-progress";
    clockInTime?: Date;
    clockOutTime?: Date;
    workedHours?: number;
    isOpen?: boolean;
    reminderSent?: boolean;
    // The user who created the shift
    createdBy: mongoose.Types.ObjectId;
    notes?: string;
    ApprovalStatus?: "pending" | "approved" | "rejected";
 
    createdAt: Date;
    updatedAt: Date;
}

const ShiftSchema: Schema<IShift> = new Schema({
    name: {
        type: String,
        required: true,
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    date: {
        type: Date,
        required: true,
    },
    startTime: {
        type: String,
        required: true,
    },
    endTime: {
        type: String,
        required: true,
    },
    role: {
        type: String,
    },
    location: {
        type: String,
    },
    status: {
        type: String,
        enum: ["assigned", "open", "completed", "cancelled", "missed", "in-progress"],
        default: "assigned",
    },
    clockInTime: {
        type: Date,
    },
    clockOutTime: {
        type: Date,
    },
    workedHours: {
        type: Number,
        default: 0,
    },
    isOpen: {
        type: Boolean,
        default: false,
    },
    reminderSent: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    notes: {
        type: String,
    },
    ApprovalStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
}, { timestamps: true }
);


export const Shift = mongoose.model<IShift>("Shift", ShiftSchema);
