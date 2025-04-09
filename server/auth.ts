import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User } from "../shared/schema";
import memorystore from "memorystore";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

// Extend the Request interface to include nonce
declare global {
  namespace Express {
    interface Request {
      nonce?: string;
    }
  }
}

// Create memory store for sessions
const MemoryStore = memorystore(session);

declare global {
  namespace Express {
    // Define User interface for Express without causing recursive reference
    interface User {
      id: number;
      usn: string;
      email: string;
      department: string;
      college: string | null;
      profilePicture: string | null;
      notifyNewNotes: boolean | null;
      notifyDownloads: boolean | null;
      createdAt: Date;
    }
  }
}

// Generate a more secure session secret
const generateSessionSecret = (): string => {
  const defaultSecret = "noteshub-secret-key";
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  try {
    return crypto.randomBytes(32).toString('hex');
  } catch (e) {
    return defaultSecret;
  }
};

// Define rate limiters
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" }
});

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // 3 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts, please try again later" }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per IP
  standardHeaders: true, 
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" }
});

// Generate a nonce for CSP
const generateNonce = (req: Request, res: Response, next: NextFunction) => {
  // Generate a unique nonce for this request
  req.nonce = crypto.randomBytes(16).toString('base64');
  next();
};

// Security middleware to set secure headers
const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Protect against clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Help protect against XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Implement HTTP Strict Transport Security (HSTS) for MITM protection
  // We apply HSTS in production and optionally in other environments based on env var
  if (process.env.NODE_ENV === 'production' || process.env.FORCE_HSTS === 'true') {
    // Stronger HSTS policy - 2 years, include subdomains, and allow preloading
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  // Enhanced Content Security Policy
  res.setHeader('Content-Security-Policy', 
    `default-src 'self'; ` +
    `script-src 'self' 'nonce-${req.nonce}' 'strict-dynamic'; ` + // Using nonce for scripts
    `style-src 'self' 'nonce-${req.nonce}' 'unsafe-inline'; ` +   // Allow inline styles with nonce
    "img-src 'self' data: blob:; " +         // Allow data URIs for images
    "font-src 'self' data:; " +              // Allow data URIs for fonts
    "connect-src 'self' https://*.replit.dev; " +   // API calls
    "media-src 'self'; " +                   // Media files
    "object-src 'none'; " +                  // Block <object>, <embed>, and <applet>
    "frame-ancestors 'none'; " +             // Another anti-clickjacking measure
    "base-uri 'self'; " +                    // Restricts use of <base>
    "form-action 'self'; " +                 // Restricts where forms can be submitted
    "require-trusted-types-for 'script'; " + // Enforce Trusted Types to prevent DOM XSS
    "upgrade-insecure-requests; " +          // Upgrade HTTP to HTTPS
    "block-all-mixed-content;"               // Block mixed content
  );
  next();
};

export function setupAuth(app: Express) {
  // Apply nonce generation first
  app.use(generateNonce);
  
  // Apply security headers
  app.use(securityHeaders);
  
  // Apply rate limiting
  app.use('/api/login', loginRateLimiter);
  app.use('/api/register', registerRateLimiter);
  app.use('/api/', apiLimiter);
  
  // Configure session middleware with secure settings
  const sessionConfig: session.SessionOptions = {
    secret: generateSessionSecret(),
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production" || process.env.FORCE_SECURE_COOKIES === "true",
      httpOnly: true, // Prevents JavaScript access to cookies
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict', // Helps prevent CSRF attacks
      domain: process.env.COOKIE_DOMAIN || undefined, // Optional domain restriction
      path: '/', // Restrict to base path
      signed: true // Sign cookies for additional protection
    }
  };

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport to use local strategy
  passport.use(new LocalStrategy(
    {
      usernameField: 'usn',
      passwordField: 'password'
    },
    async (usn, password, done) => {
      try {
        const user = await storage.validateLogin({ usn, password });
        
        if (!user) {
          return done(null, false, { message: "Invalid USN or password" });
        }
        
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Configure passport serialization/deserialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      
      if (!user) {
        return done(null, false);
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });
}