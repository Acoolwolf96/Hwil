import mongoose, { Schema, Document } from 'mongoose';

export interface IInviteToken extends Document {
  email: string;
  token: string;
  organizationId: mongoose.Types.ObjectId;
  expiresAt: Date;
  used: boolean;
}


const InviteTokenSchema: Schema<IInviteToken> = new Schema({
  email: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
});


InviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });


export const InviteToken = mongoose.model<IInviteToken>("InviteToken", InviteTokenSchema);