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
    'https://noteshub-ocpi.onrender.com',
    'https://noteshub-api-gqkp.onrender.com',
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
    
    // IMPORTANT: NEVER use wildcard with credentials
    // If it's a request from any origin, always return the specific origin
    // This is critical for CORS to work with credentials
    
    // Check against allowedOrigins first
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS: Allowing whitelisted origin: ${origin}`);
      return callback(null, origin);
    }
    
    // In development, allow any origin for easier testing
    if (process.env.NODE_ENV === 'development') {
      console.log(`CORS: Allowing development origin: ${origin}`);
      return callback(null, origin);
    }
    
    // In production, be lenient to avoid blocking legitimate requests
    if (process.env.NODE_ENV === 'production') {
      console.log(`CORS: Allowing production request from: ${origin}`);
      return callback(null, origin);
    }
    
    // Explicitly check Firebase and Render origins
    if (origin.includes('web.app') || 
        origin.includes('firebaseapp.com') || 
        origin.includes('onrender.com')) {
      console.log(`CORS: Allowing hosting platform origin: ${origin}`);
      return callback(null, origin);
    }
    
    // Otherwise, block the request
    console.log(`CORS: Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Always use credentials: true
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control']
}));

// Log CORS configuration
console.log(`CORS configuration: ${allowedOrigins.length} origins, credentials: ${useCredentials}`);

app.use(express.json());

// Sample Routes - add variants of test and status endpoints
app.get('/test', (req, res) => {
  res.json({ message: 'CORS is working!' });
});

// Add test endpoint at /api/test to match the path pattern of other endpoints
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API Test endpoint is working!',
    cors: 'If you can see this, CORS is configured correctly',
    credentials: 'enabled'
  });
});

// Import needed modules
import { isFallbackStorage } from './storage';
import { sql, db, isFallbackStorage as dbFallbackCheck } from './db';

// Database health check endpoint
app.get('/api/db-status', (req, res) => {
  try {
    // Check if using fallback storage
    const usingFallback = isFallbackStorage();
    
    // Simple response without database query to avoid potential errors
    res.json({
      status: usingFallback ? 'warning' : 'ok',
      message: usingFallback 
        ? 'Using in-memory storage as fallback. Data will not persist across restarts.' 
        : 'Database connection is configured',
      fallback: usingFallback,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    });
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

// Add multiple variants of database status endpoints for maximum compatibility
// These are backup endpoints in case the main one doesn't work on Render
app.get('/api/db-check', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Database status check endpoint'
  });
});

// Alternative paths for db status
app.get('/api/dbstatus', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Alternative database status endpoint',
    db: process.env.DATABASE_URL ? 'configured' : 'not configured'
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API status endpoint',
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    time: new Date().toISOString()
  });
});

// Similar to /api/test, just returning simple status
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is responding',
    time: new Date().toISOString()
  });
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
    const frontendDomains = "https://notezhubz.web.app https://notezhubz.firebaseapp.com https://noteshub-ocpi.onrender.com";
    const backendDomains = "https://notezhub.onrender.com https://noteshub-api-gqkp.onrender.com";
    
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
  
  // Debug log to trace CORS issues
  console.log(`CORS middleware: Processing request from origin: ${origin || 'no origin'}`);
  
  // If the origin is present, set CORS headers (NEVER use * with credentials)
  if (origin) {
    // In ALL cases, explicitly set the origin to the request's origin
    // This is critical for CORS to work with credentials
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`CORS middleware: Set Access-Control-Allow-Origin to ${origin}`);
    
    // ALWAYS set credentials to true
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    console.log(`CORS middleware: Set Access-Control-Allow-Credentials to true`);
    
    // Always set allowed methods and headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      console.log(`CORS middleware: Responding to preflight request`);
      return res.status(204).send();
    }
  } else {
    console.log(`CORS middleware: No origin in request headers, skipping CORS headers`);
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
