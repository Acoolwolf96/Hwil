import mongoose, { Document, Schema } from "mongoose";


export interface IOrganization extends Document {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const organizationSchema = new Schema<IOrganization>({
  name: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});


export const Organization = mongoose.model<IOrganization>("Organization", organizationSchema);