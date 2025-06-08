import mongoose, { Document, Schema } from "mongoose";

export interface IInvite extends Document {
  name: string;
  email: string;
  stage: "pending" | "sent" | "accepted" | "expired";
  expiresAt?: Date;  // Optional: Auto-delete expired invites
}

const inviteSchema = new Schema<IInvite>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  stage: {
    type: String,
    enum: ["pending", "sent", "accepted", "expired"],
    default: "sent",
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry (optional)
  },
}, {
  timestamps: true,  // Adds createdAt & updatedAt
});

// Optional: Auto-delete expired invites
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Invite = mongoose.model<IInvite>("Invite", inviteSchema);