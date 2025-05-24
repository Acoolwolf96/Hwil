import createError from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';



// Import routes
import usersRouter from './routes/users';
import { register, login } from './controllers/authControllers';
import notificationsRouter from './routes/notifications';
import inviteRouter from './routes/invite';
import shiftRouter from './routes/shifts';

const app = express();






// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));







// Use routes
app.use('/users', usersRouter);
app.use('/notifications', notificationsRouter);
app.use('/invites', inviteRouter);
app.use('/shifts', shiftRouter);

app.post('/login', login);
app.post('/register', register);


// catch 404 and forward to error handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(createError(404));
});

// error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);  
  res.render('error', { title: 'Error' });

});



export default app;