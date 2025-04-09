import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from 'dotenv';
import cors from 'cors';
import { securityLogger, logSecurityEvent, SecurityEventType, LogSeverity } from './security-logger';
import * as rateLimit from 'express-rate-limit';

// Load environment variables from .env file
dotenv.config();

// Log startup information
console.log('Starting NotesHub application...');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`Database environment variables: ${process.env.DATABASE_URL ? 'Present' : 'Missing'}`);

const app = express();

// Set up CORS policy
const allowedOrigins = [
  // Allow the same origin
  undefined,
  'null',
  // Production Firebase domains
  'https://notezhubz.web.app',
  'https://notezhub.firebaseapp.com',
  'https://noteshubb.web.app',
  'https://noteshub-12345.web.app',
  'https://noteshub-12345.firebaseapp.com',
  // Local development
  /^http:\/\/localhost:\d+$/,
  // Replit domain - this is important for allowing the frontend to access the backend
  /https:\/\/.*\.replit\.app$/,
  /https:\/\/.*\.repl\.co$/,
  'https://workspace.yash1si22ec119.repl.co'
];

// Fix trust proxy for rate limiter error
app.set('trust proxy', 1);

// Configure CORS for both local development and production with universal access
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if it's a Firebase domain
  const isFirebaseDomain = origin && (
    origin.includes('.firebaseapp.com') || 
    origin.includes('.web.app')
  );
  
  // Allow all origins, but include credentials only for trusted ones
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  // Only allow credentials for trusted domains
  if (isFirebaseDomain || origin?.includes('localhost') || origin?.includes('.repl.co')) {
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // Increase max age for better caching of CORS preflight responses
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});


app.use(express.json());

// Sample Route
app.get('/test', (req, res) => {
  res.json({ message: 'CORS is working!' });
});


// Apply security logger middleware
app.use(securityLogger);

// Security headers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Enhanced Content Security Policy with balanced security and functionality
  // More relaxed for development
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + 
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self'; " +
      "object-src 'none'; " +
      "connect-src 'self' *.replit.dev; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "manifest-src 'self'; " +
      "media-src 'self'; " +
      "worker-src 'self' blob:;"
    );
  } else {
    // Stricter for production, but allow necessary connections
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseio.com https://*.firebase.com https://*.googleapis.com; " + 
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: blob: https://*.googleusercontent.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "object-src 'none'; " +
      "connect-src 'self' https://*.replit.app https://*.repl.co https://*.web.app https://*.firebaseapp.com https://firebase.googleapis.com https://*.firebaseio.com https://workspace.yash1si22ec119.repl.co https://*.google-analytics.com https://*.googleapis.com https://*.cloudfunctions.net; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "manifest-src 'self'; " +
      "media-src 'self'; " +
      "worker-src 'self' blob:;"
    );
  }
  
  // In production, apply HSTS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
});

// Rate limiting for API endpoints
const apiLimiter = rateLimit.default({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      LogSeverity.WARNING,
      req,
      `Rate limit exceeded: ${req.ip}`
    );
    res.status(options.statusCode).json({
      error: options.message
    });
  }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// More strict rate limiting for authentication routes
const authLimiter = rateLimit.default({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      LogSeverity.ERROR,
      req,
      `Auth rate limit exceeded: ${req.ip}`
    );
    res.status(options.statusCode).json({
      error: 'Too many login attempts, please try again later'
    });
  }
});

// Apply stricter rate limiting to auth routes
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/forgot-password', authLimiter);
app.use('/api/reset-password', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
      
      // Log successful authentications
      if ((path === '/api/login' || path.includes('/2fa')) && res.statusCode === 200) {
        logSecurityEvent(
          SecurityEventType.AUTH_SUCCESS,
          LogSeverity.INFO,
          req,
          `Successful authentication: ${req.body?.usn || 'unknown'}`
        );
      }
      
      // Log authentication failures
      if ((path === '/api/login' || path.includes('/2fa')) && res.statusCode === 401) {
        logSecurityEvent(
          SecurityEventType.AUTH_FAILURE,
          LogSeverity.WARNING,
          req,
          `Failed authentication attempt: ${req.body?.usn || 'unknown'}`
        );
      }
    }
  });

  next();
});

// Main application startup
(async () => {
  try {
    console.log('Registering API routes...');
    const server = await registerRoutes(app);
    console.log('API routes registered successfully');

    // Global error handler
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      console.error('Unhandled error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      // Log the error with our security logger
      logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        status >= 500 ? LogSeverity.ERROR : LogSeverity.WARNING,
        req,
        `Unhandled error: ${message}`,
        { 
          stack: err.stack,
          status,
          path: req.path
        }
      );

      res.status(status).json({ 
        error: message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });

    // Setup frontend serving
    console.log(`Environment: ${app.get("env")}`);
    if (app.get("env") === "development") {
      console.log('Setting up Vite development server...');
      await setupVite(app, server);
    } else {
      console.log('Serving static production build...');
      serveStatic(app);
    }

    // Start server
    // Use PORT environment variable if set (common in Replit)
    // otherwise default to 5000
    // Also listen on port 5000 for Replit workflow detection
    const port = process.env.PORT || 5000;
    const workflowPort = 5000;
    
    // Start main server
    server.listen({
      port: Number(port),
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      console.log('-----------------------------------');
      log(`NotesHub server running on port ${port}`);
      console.log('-----------------------------------');
      
      // If we're not already using port 5000, create a small server on port 5000 
      // just for Replit workflow detection
      if (Number(port) !== workflowPort) {
        // Using Express instance we already imported at the top
        const workflowApp = express();
        workflowApp.get('/', (req: Request, res: Response) => {
          res.send('NotesHub is running on port ' + port);
        });
        
        workflowApp.listen(workflowPort, '0.0.0.0', () => {
          console.log(`Additional workflow detection server running on port ${workflowPort}`);
        });
      }
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
})();
