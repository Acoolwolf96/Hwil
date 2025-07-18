import crypto from "crypto";
import { EmailVerificationToken } from "../models/EmailVerificationToken";

export const generateVerificationToken = async (userId: string, email: string) => {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    //save to db
    await EmailVerificationToken.create({
        userId,
        token: hashedToken,
        email: email.toLowerCase(),
        expiresAt: new Date(Date.now() + 3600000),
    });

    return token;
};

export const createVerificationUrl = (token: string): string => {
    return `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
}