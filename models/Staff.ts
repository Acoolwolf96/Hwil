import mongoose, { Schema, Document } from 'mongoose';


export interface IStaff extends Document {
  name: string;
  email: string;
  password: string;
    role: 'staff';
  organizationId: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
  emailVerified: boolean;
  emailVerifiedAt: Date;
  notifications: IUserNotification[];
}

export interface IUserNotification {
  type: 'leave_approved' | 'leave_rejected' | 'leave_modified' | 'leave_assigned';
  message: string;
  relatedLeave?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;

}

const notificationSchema = new Schema<IUserNotification>({
  type: {
    type: String,
    enum: ['leave_approved', 'leave_rejected', 'leave_modified', 'leave_assigned'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  relatedLeave: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Leave',
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

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
  emailVerified:{
    type: Boolean,
    default: false
  },
  emailVerifiedAt:{
    type: Date,
    required: false
  },
  notifications: [notificationSchema]

}, {
  timestamps: true
});

export const Staff = mongoose.model<IStaff>('Staff', staffSchema);