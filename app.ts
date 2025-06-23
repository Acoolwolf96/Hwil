import createError from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';

import { authMiddleware } from './middleware/auth';

import usersRouter from './routes/users';
import {
  register,
  login,
  getAllStaffInOrg,
  forgotPassword,
  resetPassword,
  validateResetToken,
  getCurrentUser,
  logout,
} from './controllers/authControllers';
import { refreshAccessToken } from './controllers/refreshtokens';
import { loginSchema, registerSchema } from './validation/authSchema';
import { validateRequest } from './middleware/validateRequest';
import notificationsRouter from './routes/notifications';
import inviteRouter from './routes/invite';
import shiftRouter from './routes/shifts';

const app = express();

/* ─────────────────────────── 1. global middleware ────────────────────────── */
app.use(cookieParser());          // must be FIRST so req.cookies is populated
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

/* ----- optional: security headers ----------------------------------------- */
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

/* ----- CORS --------------------------------------------------------------- */
const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean) as string[]; // e.g. https://example.onrender.com

app.use(
    cors({
      origin: allowedOrigins,      // exact origin(s) – not "*"
      credentials: true,           // allow cookies
      exposedHeaders: ['X-New-Token'],
    })
);

/* ─────────────────────────── 2. debug helper (optional) ──────────────────── */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log('Cookies:', req.cookies);
    next();
  });
}

/* ─────────────────────────── 3. routes ------------------------------------ */
const apiRouter = express.Router();

apiRouter.use('/users', usersRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/invites', inviteRouter);
apiRouter.use('/shifts', shiftRouter);

apiRouter.post('/login',    validateRequest(loginSchema),    login);
apiRouter.post('/register', validateRequest(registerSchema), register);
apiRouter.post('/logout',   logout);

apiRouter.post('/forgot-password', forgotPassword);
apiRouter.post('/reset-password',  resetPassword);
apiRouter.get ('/validate-reset-token', validateResetToken);

apiRouter.get ('/staff', authMiddleware, getAllStaffInOrg);
apiRouter.get ('/auth/me', authMiddleware, getCurrentUser);
apiRouter.post('/refresh-token', refreshAccessToken);

app.use('/v4', apiRouter);  // mount under /v4

/* ─────────────────────────── 4. 404 / error handlers ---------------------- */
app.use((_req, _res, next) => next(createError(404)));

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(err.status || 500).json({
    message: err.message,
    error  : app.get('env') === 'development' ? err : {},
  });
});

export default app;