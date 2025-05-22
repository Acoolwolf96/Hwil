#!/usr/bin/env node

import app from '../app';
import http from 'http';
import dotenv from 'dotenv';
import { connectDB } from '../dbconfig'; // Adjust path as needed

dotenv.config();

const debug = require('debug')('hwil:server');

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

async function startServer() {
  try {
    await connectDB();  // Connect to MongoDB first
    const server = http.createServer(app);

    server.listen(port);
    server.on('error', onError);
    server.on('listening', () => onListening(server));
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}

startServer();

function normalizePort(val: string): number | string | false {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

function onError(error: { syscall: string; code: any }) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening(server: http.Server): void {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
  debug(`Listening on ${bind}`);
  console.log(`Server is listening on ${bind}`);
}
