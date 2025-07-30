import createError from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';

import './types/express_aug';

// Import routes
import usersRouter from './routes/users';
import {
  register,
  login,
  getAllStaffInOrg,
  forgotPassword,
  resetPassword,
  validateResetToken,
  changePassword,
  deleteStaff,
  logout,
  registerStaffWithToken,
  verifyEmail,
  resendVerificationEmail
} from './controllers/authControllers';
import { loginSchema, registerSchema } from "./validation/authSchema";
import { validateRequest } from "./middleware/validateRequest";
import notificationsRouter from './routes/notifications';
import inviteRouter from './routes/invite';
import shiftRouter from './routes/shifts';
import leaveRouter from './routes/leave';
import approvalRouter from './routes/approval';

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  exposedHeaders: ['X-New-Token', 'Authorization']
}));

// Security headers - Move this BEFORE routes
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const apiRouter = express.Router();

// Auth routes (public)
apiRouter.post('/login', validateRequest(loginSchema), login);
apiRouter.post('/register', validateRequest(registerSchema), register);
apiRouter.post('/logout', logout);
apiRouter.post('/forgot-password', forgotPassword);
apiRouter.post('/reset-password', resetPassword);
apiRouter.get('/validate-reset-token', validateResetToken);
apiRouter.post('/register-staff', registerStaffWithToken);
apiRouter.get('/verify-email', verifyEmail);
apiRouter.post('/resend-verification', resendVerificationEmail);

// Protected auth routes
apiRouter.post('/change-password', authMiddleware, changePassword);

// Protected resource routes
apiRouter.use('/users', authMiddleware, usersRouter);
apiRouter.use('/notifications', authMiddleware, notificationsRouter);
apiRouter.use('/approvals', authMiddleware, approvalRouter)
apiRouter.use('/invites', inviteRouter);
apiRouter.use('/shifts', authMiddleware, shiftRouter);
apiRouter.use('/leave', authMiddleware, leaveRouter);
apiRouter.get('/staff', authMiddleware, getAllStaffInOrg);
apiRouter.delete('/staff/:id', authMiddleware, deleteStaff);

// Mount the API router
app.use('/v4', apiRouter);

// Catch 404 and forward to error handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(createError(404));
});

// Error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  // Log error in development
  if (req.app.get('env') === 'development') {
    console.error(err.stack);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

export default app;