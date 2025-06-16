import createError from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { secureLogger } from './middleware/secureLogging';


import './types/express_aug';

// Import routes
import usersRouter from './routes/users';
import { register, login, getAllStaffInOrg, forgotPassword, resetPassword, validateResetToken, logout } from './controllers/authControllers';
import { loginSchema, registerSchema } from "./validation/authSchema";
import { validateRequest } from "./middleware/validateRequest";
import notificationsRouter from './routes/notifications';
import inviteRouter from './routes/invite';
import shiftRouter from './routes/shifts';

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  exposedHeaders: ['X-New-Token'] // Removed Authorization from exposed headers
}));

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Use secure logger to prevent logging sensitive information
app.use(secureLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


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

app.use('/v4', apiRouter); // Mount the grouped routes

// catch 404 and forward to error handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(createError(404));
});

// Add security headers
app.use((req, res, next) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self'; frame-ancestors 'none';"
  );

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS protection in browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

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
