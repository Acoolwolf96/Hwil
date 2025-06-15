
import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordResetToken extends Document {
    userId: mongoose.Types.ObjectId;
    token: string;
    email: string;
    expiresAt: Date;
    createdAt: Date;
}

const PasswordResetTokenSchema: Schema<IPasswordResetToken> = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 3600000), // 1 hour from now
    },
}, { timestamps: true });

// Auto delete expired tokens
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = mongoose.model<IPasswordResetToken>("PasswordResetToken", PasswordResetTokenSchema);