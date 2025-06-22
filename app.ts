import createError from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import cookie from 'cookie';

import './types/express_aug';

// Import routes
import usersRouter from './routes/users';
import { register, login, getAllStaffInOrg, forgotPassword, resetPassword, validateResetToken, getCurrentUser, logout } from './controllers/authControllers';
import { refreshAccessToken } from "./controllers/refreshtokens";
import { loginSchema, registerSchema } from "./validation/authSchema";
import { validateRequest } from "./middleware/validateRequest";
import notificationsRouter from './routes/notifications';
import inviteRouter from './routes/invite';
import shiftRouter from './routes/shifts';

const app = express();

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  exposedHeaders: ['X-New-Token']
}));

app.use((req, res, next) => {
  console.log('Incoming cookies:', req.cookies);
  console.log('Incoming headers:', req.headers);
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req: Request, res: Response, next: NextFunction) => {
  // Merge cookies from header if they exist
  if (req.headers.cookie) {
    const parsedCookies = cookie.parse(req.headers.cookie);
    req.cookies = { ...parsedCookies, ...req.cookies };
  }
  next();
});

const apiRouter = express.Router();

apiRouter.use('/users', usersRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/invites', inviteRouter);
apiRouter.use('/shifts', shiftRouter);
apiRouter.post('/login', validateRequest(loginSchema), login);
apiRouter.post('/register', validateRequest(registerSchema), register);
apiRouter.post('/logout', logout)

apiRouter.post('/forgot-password', forgotPassword);
apiRouter.post('/reset-password', resetPassword);
apiRouter.get('/validate-reset-token', validateResetToken);
apiRouter.get('/staff', authMiddleware, getAllStaffInOrg);
apiRouter.post('/refresh-token', refreshAccessToken);
apiRouter.get('/auth/me', authMiddleware, getCurrentUser)

app.use('/v4', apiRouter); // Mount the grouped routes

// catch 404 and forward to error handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(createError(404));
});

// Add headers
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

// error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  res.status(err.status || 500).json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

export default app;
