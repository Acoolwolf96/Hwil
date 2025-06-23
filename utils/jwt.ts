import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

/**
 * This module provides functions to generate and verify JWT tokens.
 */
export interface JwtPayload {
    id: string;
    email: string;
    role: string;
    organizationId: string;
    jti: string;
}

const accessPrivateKey = fs.readFileSync(path.resolve(process.env.JWT_ACCESS_PRIVATE_KEY_PATH!), 'utf8');
const accessPublicKey = fs.readFileSync(path.resolve(process.env.JWT_ACCESS_PUBLIC_KEY_PATH!), 'utf8');
const refreshPrivateKey = fs.readFileSync(path.resolve(process.env.JWT_REFRESH_PRIVATE_KEY_PATH!), 'utf8');
const refreshPublicKey = fs.readFileSync(path.resolve(process.env.JWT_REFRESH_PUBLIC_KEY_PATH!), 'utf8');

/**
 * Generates an access token for a user.
 *
 * @param user - The user object containing id, email, role, and organizationId
 * @returns The generated access token
 */
export const generateAccessToken = (user: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
}): string => {
    const jti = uuidv4();
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        jti,
    };

    return jwt.sign(payload, accessPrivateKey, {
        algorithm: 'RS256',
        expiresIn: parseTimeToSeconds(process.env.JWT_ACCESS_EXPIRES),
    });
};

/**
 * Generates a refresh token for the user.
 * The refresh token is signed with the private key and includes a unique identifier (jti).
 *
 * @param user - The user object containing id, email, role, and organizationId
 * @returns The generated refresh token
 */
export const generateRefreshToken = (user: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
}): string => {
    const jti = uuidv4();
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        jti,
    };

    return jwt.sign(payload, refreshPrivateKey, {
        algorithm: 'RS256',
        expiresIn: parseTimeToSeconds(process.env.JWT_REFRESH_EXPIRES),
    });
};

/**
 * Verifies the access token and returns the payload.
 * Throws an error if the token is invalid or expired.
 *
 * @param token - The access token to verify
 * @returns The decoded JWT payload
 * @throws Error if verification fails
 */
export const verifyAccessToken = (token: string): JwtPayload => {
    return jwt.verify(token, accessPublicKey, { algorithms: ['RS256'] }) as JwtPayload;
};

/**
 * Verifies the refresh token and returns the payload.
 * Throws an error if the token is invalid or expired.
 *
 * @param token - The refresh token to verify
 * @returns The decoded JWT payload
 * @throws Error if verification fails
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
    try {
        console.log('Verifying refresh token...');
        const verifiedToken = jwt.verify(token, refreshPublicKey, { algorithms: ['RS256'] });
        console.log('Refresh token verified successfully');
        return verifiedToken as JwtPayload;
    } catch (error: any) {
        console.error('Refresh token verification failed:', error.name, error.message);
        if (error.name === 'TokenExpiredError') {
            console.error('Token expired at:', error.expiredAt);
        }
        throw error;
    }
};

/**
 * Converts a duration string like "15m", "2h", "1d" into seconds.
 * Supported units: s (seconds), m (minutes), h (hours), d (days)
 * Falls back to 900 seconds (15 minutes) if invalid.
 *
 * @param duration - The duration string to parse
 * @param fallback - Fallback value in seconds (default: 900)
 * @returns Duration in seconds
 */
export const parseTimeToSeconds = (duration: string | undefined, fallback: number = 900): number => {
    if (!duration) return fallback;

    const match = /^(\d+)([smhd])$/.exec(duration.trim());
    if (!match) return fallback;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 60 * 60 * 24;
        default: return fallback;
    }
};

const selfTest = () => {
    const testToken = generateAccessToken({
        id: 'test',
        email: 'test@example.com',
        role: 'test',
        organizationId: 'test',
    });

    try {
        verifyAccessToken(testToken);
        console.log('✔ signing / verifying keys match');
    } catch (e) {
        console.error('✘ keys do NOT match:', e);
    }
};

selfTest();