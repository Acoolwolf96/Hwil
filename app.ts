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
  exposedHeaders: ['X-New-Token', 'Authorization']
}));

app.use(logger('dev'));
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
