# Security Improvements

This document outlines the security improvements made to the application to address potential vulnerabilities.

## Token Security

### Token Blacklisting

- Implemented token blacklisting to invalidate tokens on logout
- Both access and refresh tokens are now added to a blacklist when a user logs out
- The auth middleware checks if tokens are blacklisted before accepting them

### HTTP-Only Cookies

- Refresh tokens are now stored in HTTP-only cookies
- HTTP-only cookies cannot be accessed by JavaScript, protecting against XSS attacks
- Cookies are set with secure and sameSite flags in production

### Token Rotation

- Added a utility to rotate JWT signing keys (`utils/rotateKeys.ts`)
- Running this utility will invalidate all existing tokens
- Use this in case of a security breach or as part of regular security maintenance

## Request/Response Security

### Secure Headers

- Enhanced Content-Security-Policy to restrict resource loading
- Added X-Frame-Options to prevent clickjacking
- Added X-XSS-Protection to enable browser XSS protection
- Added X-Content-Type-Options to prevent MIME type sniffing
- Added Referrer-Policy to control referrer information

### HTTPS Enforcement

- Added middleware to force HTTPS in production
- All HTTP requests are redirected to HTTPS

### CORS Configuration

- Restricted CORS to only allow requests from the frontend URL
- Removed Authorization from exposed headers
- Enabled credentials to allow cookies to be sent

## Logging Security

### Secure Logging

- Created a secure logging middleware that redacts sensitive information
- Authorization headers and cookies are no longer logged
- This prevents accidental exposure of tokens in logs

## How to Use

### Invalidating a Specific Token

When a user logs out, their tokens are automatically invalidated. If you need to invalidate a specific token manually:

```typescript
import revokedToken from '../models/revokedToken';

// Assuming you have the token's JTI (JWT ID)
await new revokedToken({ jti: 'token-jti-here' }).save();
```

### Invalidating All Tokens

To invalidate all tokens (e.g., in case of a security breach):

```typescript
import { rotateJwtKeys } from './utils/rotateKeys';

// This will generate new key pairs and invalidate all existing tokens
rotateJwtKeys();
```

### Frontend Considerations

- Never log Authorization headers or tokens in the frontend
- Use HTTP-only cookies for authentication when possible
- Implement proper CSRF protection
- Always use HTTPS in production