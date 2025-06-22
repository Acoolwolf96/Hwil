import { CookieOptions } from 'express';

export const cookieConfig: CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined, // Set this if using cross-subdomain auth
};