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

// Fix trust proxy for rate limiter error
app.set('trust proxy', 1);

// Define allowed origins for CORS - either from environment variable or hardcoded defaults
let allowedOrigins: string[];
if (process.env.CORS_ALLOW_ORIGIN) {
  // Use origins from environment variable
  allowedOrigins = process.env.CORS_ALLOW_ORIGIN.split(',');
  console.log('Using CORS origins from environment:', allowedOrigins);
} else {
  // Use hardcoded defaults
  allowedOrigins = [
    'https://notezhubz.web.app',
    'https://notezhubz.firebaseapp.com',
    'https://notezhub.onrender.com',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173'
  ];
  console.log('Using default CORS origins');
}

// Use credentials from environment variable or default to true
const useCredentials = process.env.CORS_CREDENTIALS !== 'false'; // default to true unless explicitly set to 'false'

// Configure CORS using the package with explicit origins and credentials
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check against allowedOrigins
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    }
    
    // In development, allow any origin for easier testing
    if (process.env.NODE_ENV === 'development') {
      return callback(null, origin);
    }
    
    // In production, be more permissive to avoid blocking legitimate requests
    // This prevents issues when deployed to Firebase, Render, etc.
    if (process.env.NODE_ENV === 'production') {
      console.log(`CORS request from origin: ${origin}`);
      return callback(null, origin);
    }
    
    // Otherwise, block the request
    callback(new Error('Not allowed by CORS'));
  },
  credentials: useCredentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control']
}));

// Log CORS configuration
console.log(`CORS configuration: ${allowedOrigins.length} origins, credentials: ${useCredentials}`);

app.use(express.json());

// Sample Route
app.get('/test', (req, res) => {
  res.json({ message: 'CORS is working!' });
});

// Import needed modules
import { isFallbackStorage } from './storage';
import { sql, db, isFallbackStorage as dbFallbackCheck } from './db';

// Database health check endpoint
app.get('/api/db-status', (req, res) => {
  try {
    // Check if using fallback storage
    const usingFallback = isFallbackStorage() || dbFallbackCheck();
    
    if (usingFallback) {
      res.json({
        status: 'warning',
        message: 'Using in-memory storage as fallback. Data will not persist across restarts.',
        fallback: true
      });
    } else {
      // Try to run a test query to verify connection
      sql`SELECT 1 as test`
        .then((result: any) => {
          res.json({
            status: 'ok',
            message: 'Database connection is active',
            fallback: false,
            test_result: result
          });
        })
        .catch((dbError: any) => {
          console.error('Database test query failed:', dbError);
          res.status(500).json({
            status: 'error',
            message: 'Database connection test failed',
            error: dbError.message,
            code: dbError.code
          });
        });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in db-status endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check database status',
      error: errorMessage
    });
  }
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
  if (process.env.NODE_ENV === 'development') {
    // In development mode, we need to be more permissive
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + 
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self'; " +
      "object-src 'none'; " +
      "connect-src 'self' *; " +  // Allow all connections in dev
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "manifest-src 'self'; " +
      "media-src 'self'; " +
      "worker-src 'self' blob:;"
    );
  } else {
    // Production CSP - specifically allow cross-origin between Firebase and Render
    const frontendDomains = "https://notezhubz.web.app https://notezhubz.firebaseapp.com";
    const backendDomains = "https://notezhub.onrender.com";
    
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + 
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self'; " +
      "object-src 'none'; " +
      `connect-src 'self' ${frontendDomains} ${backendDomains}; ` +
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

// Custom CORS headers middleware for better compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // If the origin is allowed, set the ACAO header to the specific origin
  // This is important because with credentials, wildcard origins aren't allowed
  if (origin) {
    // In development, allow any origin
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } 
    // In production, check against allowed origins or be more lenient
    else if (process.env.NODE_ENV === 'production') {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    // Check explicitly for Firebase hosting origins
    else if (origin.includes('notezhubz.web.app') || origin.includes('firebaseapp.com')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    // Add additional CORS headers for preflight requests
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).send();
    }
  }
  
  next();
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
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      console.log('-----------------------------------');
      log(`NotesHub server running on port ${port}`);
      console.log('-----------------------------------');
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
})();
