import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// Define security event types
export enum SecurityEventType {
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  AUTH_FAILURE = 'AUTH_FAILURE',
  JWT_FAILURE = 'JWT_FAILURE',
  ACCESS_DENIED = 'ACCESS_DENIED',
  FILE_SECURITY = 'FILE_SECURITY',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TWO_FACTOR_SUCCESS = 'TWO_FACTOR_SUCCESS',
  TWO_FACTOR_FAILURE = 'TWO_FACTOR_FAILURE'
}

// Define severity levels
export enum LogSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

// Security event interface
interface SecurityEvent {
  timestamp: string;
  eventType: SecurityEventType;
  severity: LogSeverity;
  userId?: number | string;
  usn?: string;
  ip: string;
  userAgent?: string;
  path: string;
  message: string;
  details?: any;
}

// Log file configuration
const LOG_DIR = path.join(process.cwd(), 'logs');
const SECURITY_LOG_FILE = path.join(LOG_DIR, 'security.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Main logging function
export function logSecurityEvent(
  eventType: SecurityEventType,
  severity: LogSeverity,
  req: Request,
  message: string,
  details?: any
) {
  // Extract relevant information from request
  const userId = req.session?.userId || req.user?.id || 'unauthenticated';
  const usn = req.user?.usn || 'unknown';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const path = req.originalUrl || req.url || 'unknown';

  // Create security event object
  const event: SecurityEvent = {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    userId,
    usn,
    ip,
    userAgent,
    path,
    message,
    details
  };

  // Log to console with proper formatting based on severity
  const colorCode = {
    [LogSeverity.INFO]: '\x1b[32m', // Green
    [LogSeverity.WARNING]: '\x1b[33m', // Yellow
    [LogSeverity.ERROR]: '\x1b[31m', // Red
    [LogSeverity.CRITICAL]: '\x1b[41m\x1b[37m', // White on red background
  };
  
  const resetColor = '\x1b[0m';
  console.log(`${colorCode[severity]}[SECURITY ${severity}]${resetColor} ${message}`);

  // Also log to file
  try {
    const logEntry = JSON.stringify(event) + '\n';
    fs.appendFileSync(SECURITY_LOG_FILE, logEntry);
  } catch (error) {
    console.error('Failed to write to security log file:', error);
  }

  // For critical events, we might want to take additional actions
  if (severity === LogSeverity.CRITICAL) {
    // This could be expanded to notify admins via email, SMS, etc.
    console.error('CRITICAL SECURITY EVENT:', event);
  }
}

// Express middleware for logging security events
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  // Store the original status method to intercept it
  const originalStatus = res.status;
  
  // Override the status method
  res.status = function(code: number) {
    const result = originalStatus.apply(res, [code]);
    
    // Log security-related HTTP status codes
    if (code === 401) {
      logSecurityEvent(
        SecurityEventType.AUTH_FAILURE,
        LogSeverity.WARNING,
        req,
        `Authentication failure - ${req.method} ${req.originalUrl || req.url}`
      );
    } else if (code === 403) {
      logSecurityEvent(
        SecurityEventType.ACCESS_DENIED,
        LogSeverity.WARNING,
        req,
        `Access denied - ${req.method} ${req.originalUrl || req.url}`
      );
    } else if (code === 429) {
      logSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        LogSeverity.WARNING,
        req,
        `Rate limit exceeded - ${req.method} ${req.originalUrl || req.url}`
      );
    } else if (code >= 500) {
      logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        LogSeverity.ERROR,
        req,
        `Server error - ${req.method} ${req.originalUrl || req.url}`
      );
    }
    
    return result;
  };
  
  next();
}