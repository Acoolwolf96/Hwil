import mongoose, { Schema, Document } from "mongoose";


export interface IEmailVerificationToken extends Document {
    userId: mongoose.Types.ObjectId;
    token: string;
    email: string;
    expiresAt: Date;
    createdAt: Date;
}

const EmailVerificationTokenSchema = new Schema<IEmailVerificationToken>({
    userId:{
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    token:{
        type: String,
        required: true,
        unique:true,
    },
    email:{
        type: String,
        required: true,
        lowercase: true,
    },
    expiresAt:{
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 3600000),
        index: { expireAfterSeconds: 0 }
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
});

export const EmailVerificationToken = mongoose.model<IEmailVerificationToken>('EmailVerificationToken', EmailVerificationTokenSchema);