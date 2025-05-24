import mongoose, { Schema, Document } from 'mongoose';


export interface IStaff extends Document {
  name: string;
  email: string;
  password: string;
    role: 'staff';
  organizationId: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
}

const staffSchema = new Schema<IStaff>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
    role: {
        type: String,
        enum: ['staff'],
        default: 'staff',
        required: true,
    },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, {
  timestamps: true });

export const Staff = mongoose.model<IStaff>('Staff', staffSchema);