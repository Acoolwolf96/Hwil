import mongoose, { Document, Schema } from "mongoose";



export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "manager" | "staff";
  organizationId: mongoose.Types.ObjectId;
  emailVerified: boolean;
  emailVerifiedAt: Date;
  createdAt: Date;
  
}

const userSchema = new Schema<IUser>({
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
    enum: ["manager", "staff"],
    default: "manager",
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
  },
  emailVerified:{
    type: Boolean,
    default: false
  },
  emailVerifiedAt:{
    type: Date,
    required: false
  },
});


export const User = mongoose.model<IUser>("User", userSchema);