import fs from 'fs';
import jwt from 'jsonwebtoken';
import path, { parse } from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';


dotenv.config();

export interface JwtPayload {
  id: string;
    email: string;
    role: string;
    organizationId: string;
    jti: string;
    iat: number;
}

const accessPrivateKey = fs.readFileSync(path.resolve(process.env.JWT_ACCESS_PRIVATE_KEY_PATH!), 'utf8');
const accessPublicKey = fs.readFileSync(path.resolve(process.env.JWT_ACCESS_PUBLIC_KEY_PATH!), 'utf8');
const refreshPrivateKey = fs.readFileSync(path.resolve(process.env.JWT_REFRESH_PRIVATE_KEY_PATH!), 'utf8');
const refreshPublicKey = fs.readFileSync(path.resolve(process.env.JWT_REFRESH_PUBLIC_KEY_PATH!), 'utf8');

export const generateAccessToken = ( user: {
    id: string;
        email: string;
        role: string;
        organizationId: string;
    }): string => {
    const jti = uuidv4();
    const payload: JwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        jti,
        iat: Math.floor(Date.now() / 1000),
    };
    
    return jwt.sign(payload, accessPrivateKey, {
        algorithm: 'RS256',
        expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES!, 15),
    });
};

export const generateRefreshToken = ( user: {
    id: string;
        email: string;
        role: string;
        organizationId: string;
    }): string => {
    const jti = uuidv4();
    const payload: JwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        jti,
        iat: Math.floor(Date.now() / 1000),
    };
    
    return jwt.sign(payload, refreshPrivateKey, {
        algorithm: 'RS256',
        expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES!, 15),
    });
};

export const verifyAccessToken = (token: string): JwtPayload => {
    try {
        return jwt.verify(token, accessPublicKey, { algorithms: ['RS256'] }) as JwtPayload;
    } catch (error) {
        throw new Error('Invalid access token');
    }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
    try {
        return jwt.verify(token, refreshPublicKey, { algorithms: ['RS256'] }) as JwtPayload;
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};
