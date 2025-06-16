import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

/**
 * Custom morgan token that redacts sensitive information from the request
 * This prevents logging of Authorization headers and other sensitive data
 */
morgan.token('secure-headers', (req: Request) => {
  const headers = { ...req.headers };
  
  // Remove sensitive headers from logs
  if (headers.authorization) {
    headers.authorization = '[REDACTED]';
  }
  
  if (headers.cookie) {
    headers.cookie = '[REDACTED]';
  }
  
  return JSON.stringify(headers);
});

/**
 * Custom morgan format that uses the secure-headers token
 * This format logs request information without sensitive data
 */
const secureFormat = ':method :url :status :response-time ms - :secure-headers';

/**
 * Middleware that provides secure logging
 * This prevents sensitive information from being logged
 */
export const secureLogger = morgan(secureFormat);