import mongoose, { Schema, Document } from 'mongoose';


export interface IShift extends Document {
  organizationId: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
    endTime: string;
    role?: string;
    location?: string;
    status: "assigned" | "open" | "completed" | "cancelled" | "missed";
    punchInTime?: Date;
    punchOutTime?: Date;
    workedHours?: number;
    isOpen?: boolean;
    createdBy: mongoose.Types.ObjectId;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ShiftSchema: Schema<IShift> = new Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
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
        enum: ["assigned", "open", "completed", "cancelled", "missed"],
        default: "assigned",
    },
    punchInTime: {
        type: Date,
    },
    punchOutTime: {
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
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    notes: {
        type: String,
    }
}, { timestamps: true }
);


export default mongoose.model<IShift>("Shift", ShiftSchema);