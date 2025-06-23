import { CookieOptions } from 'express';

/*
 * If you deploy several environments (prod / staging / local) it is nice to be
 * able to control the Domain at run-time.  When COOKIE_DOMAIN is missing we
 * fall back to .onrender.com (covers every sub-domain of onrender.com).
 */
const cookieDomain =
    process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN.length > 0
        ? process.env.COOKIE_DOMAIN                  // e.g. ".mycompany.com"
        : '.onrender.com';                           // default for Render

export const cookieConfig: CookieOptions = {
    httpOnly: true,                                // JS cannot read it
    secure  : true,                                // HTTPS only (Render is HTTPS)
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain  : cookieDomain,                        // <- key for cross-sub-domain
    path    : '/v4',
};