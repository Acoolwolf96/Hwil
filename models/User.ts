import mongoose, { Document, Schema } from "mongoose";



export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "manager" | "staff";
  organizationId: mongoose.Types.ObjectId;
  
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
    default: "staff",
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
  },
});


export const User = mongoose.model<IUser>("User", userSchema);