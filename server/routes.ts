import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, sql } from "./db";
import { notes, drawings } from "@shared/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { 
  searchNotesSchema, 
  insertNoteSchema, 
  registerUserSchema, 
  loginUserSchema, 
  updateUserSettingsSchema,
  updatePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
  type User 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import session from "express-session";
import memorystore from "memorystore";
import { sanitizeObject, sanitizeUserText, sanitizeUserHtml } from "./utils";
import { validateFile, sanitizeFilenameForStorage, ALLOWED_FILE_TYPES } from "./file-security";
import { log } from "./vite";
import { generateAccessToken, generateRefreshToken, verifyToken, extractToken } from "./jwt";
import authRoutes, { verifyJWT } from "./auth-routes";

// Set up multer for file storage
const uploadDir = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage_ = multer.diskStorage({
  destination: function (req: Express.Request, file: Express.Multer.File, cb) {
    cb(null, uploadDir);
  },
  filename: function (req: Express.Request, file: Express.Multer.File, cb) {
    // Generate a unique filename while keeping the original extension
    const extension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${extension}`;
    cb(null, uniqueFilename);
  }
});

// We've replaced this with the enhanced version from file-security.ts

// Create multer upload middleware with basic checks
// Detailed validation happens after upload
const upload = multer({
  storage: storage_,
  limits: {
    fileSize: 15 * 1024 * 1024, // Setting higher than our actual limit for better error handling
  },
  fileFilter: function (req: Express.Request, file: Express.Multer.File, cb) {
    // Accept only specific file types
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, and MD files are allowed.'));
    }
  }
});

// Type augmentation for Express session
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    tempUserId?: number;
  }
}

// Auth middleware that checks for either session or token
const isAuthenticated = async (req: Request, res: Response, next: Function) => {
  // First check for JWT token in headers
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    try {
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        // Set userId in request for downstream use
        req.session.userId = decoded.userId;
        return next();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }
  }
  
  // Fall back to session-based auth if token is not present or invalid
  if (req.session && req.session.userId) {
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized' });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Test Routes for API connectivity troubleshooting
  app.get('/test', (req, res) => {
    res.json({ 
      message: 'CORS is working!',
      timestamp: new Date().toISOString()
    });
  });
  
  // Root path - serve basic info to help with deployment debugging
  app.get('/', (req, res, next) => {
    // Check if this is an API-only request (no Accept header for HTML)
    if (!req.headers.accept || !req.headers.accept.includes('text/html')) {
      return res.json({
        name: 'NotesHub API',
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        message: 'API server is running. Use /api/health for more detailed status.'
      });
    }
    
    // For HTML requests, let the frontend handle it
    next();
  });
  
  // Simple health check endpoint - accessible at both /api/health and /health
  const healthHandler = (req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      message: 'API server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      host: req.get('host'),
      path: req.path,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      headers: req.headers
    });
  };
  
  // Register the health check at multiple paths for testing
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);  // Alternative path, useful for testing

  // Set up session middleware
  const MemoryStore = memorystore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || "noteshub-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
      httpOnly: true,
      path: '/',
      // Don't set domain in cross-origin scenarios to allow all domains
      domain: undefined
    }
  }));
  
  // Register JWT auth routes
  app.use('/api/auth', authRoutes);
  
  // Authentication Routes
  
  // POST /api/register - Register a new user
  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      // First, manually validate the USN and department code match
      if (req.body.usn && req.body.department) {
        const usn = req.body.usn.toUpperCase();
        const department = req.body.department;
        
        // Extract department code using regex pattern
        const usnPattern = /^[0-9][A-Za-z]{2}[0-9]{2}([A-Za-z]{2})[0-9]{3}$/;
        const match = usn.match(usnPattern);
        
        if (match) {
          // The department code is in the first capture group
          const usnDeptCode = match[1];
          
          // Import DEPARTMENT_CODES from schema
          const { DEPARTMENT_CODES } = await import("@shared/schema");
          
          // Check if department code maps to expected department
          const expectedDept = DEPARTMENT_CODES[usnDeptCode];
          
          if (expectedDept && expectedDept !== department) {
            return res.status(400).json({
              error: `USN department code '${usnDeptCode}' doesn't match selected department '${department}'. Expected: '${expectedDept}'`
            });
          }
        }
      }
      
      // Proceed with standard validation
      const userData = registerUserSchema.parse(req.body);
      
      // First check if user with this USN already exists before registration
      const existingUser = await storage.getUserByUSN(userData.usn);
      if (existingUser) {
        return res.status(409).json({ error: "USN already exists. Please login instead." });
      }
      
      // Year validation is no longer needed, but we'll keep default for backward compatibility
      userData.year = userData.year || 1; // Default to 1 if not provided

      // Register the user
      const user = await storage.registerUser({
        usn: userData.usn,
        email: userData.email,
        department: userData.department,
        college: userData.college,
        year: userData.year, // Include the year field
        password: userData.password
      });
      
      // Set session
      req.session.userId = user.id;
      
      // Return user data (excluding password)
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else if (error instanceof Error) {
        // Check for specific error messages
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          res.status(409).json({ error: "USN already exists. Please login instead." });
        } else {
          res.status(400).json({ error: error.message });
        }
      } else {
        res.status(500).json({ error: 'Failed to register user' });
      }
    }
  });
  
  // POST /api/login - User login
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      // Validate login data
      const loginData = loginUserSchema.parse(req.body);
      
      // First check if the USN exists
      const userExists = await storage.getUserByUSN(loginData.usn);
      if (!userExists) {
        return res.status(401).json({ error: 'USN not registered. Please register first.' });
      }
      
      // Authenticate user
      const user = await storage.validateLogin(loginData);
      
      if (!user) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }
      
      // Check if 2FA is enabled for this user
      const twoFactorEnabled = await storage.isTwoFactorEnabled(user.id);
      
      if (twoFactorEnabled) {
        // Store temporary user ID for 2FA verification
        req.session.tempUserId = user.id;
        
        // Return 2FA required status
        return res.status(200).json({
          twoFactorRequired: true,
          message: 'Two-factor authentication required'
        });
      }
      
      // Standard login (no 2FA)
      // Set session
      req.session.userId = user.id;
      
      // Generate JWT tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      
      // Store refresh token
      await storage.storeRefreshToken(user.id, refreshToken);
      
      // Return user data with tokens
      const { password, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        accessToken,
        refreshToken
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to login' });
      }
    }
  });
  
  // POST /api/logout - User logout
  app.post('/api/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      // Clear the cookie with the same settings as when it was set
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
        // Don't set domain in cross-origin scenarios to allow all domains
        domain: undefined
      });
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });
  
  // Google Authentication - Verify the Google ID token and authenticate the user
  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      // Validate Google auth data
      const googleData = googleAuthSchema.parse(req.body);
      
      // Verify the Google ID token (in a real app, you would use Firebase Admin SDK)
      // For our implementation, we're assuming the token has been verified by the client
      // and we're just using the email to authenticate/create the user
      
      if (!googleData.email) {
        return res.status(400).json({ error: 'Email is required for Google authentication' });
      }
      
      // Check if the user with this email already exists in our system
      // If not, a new user will be created automatically by this method
      const user = await storage.authenticateWithGoogle(googleData.email);
      
      if (user) {
        // Whether existing or new user, complete the authentication process
        req.session.userId = user.id;
        
        // Prepare and return safe user data
        const { password, ...safeUser } = user;
        
        // Generate JWT tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        
        // Store refresh token in the database
        await storage.storeRefreshToken(user.id, refreshToken);
        
        // Determine if this is a newly created user
        const isNewUser = user.createdAt && 
          (new Date().getTime() - new Date(user.createdAt).getTime()) < 5000; // Within 5 seconds
        
        return res.status(200).json({
          user: safeUser,
          accessToken,
          refreshToken,
          isNewUser
        });
      } else {
        // This shouldn't happen with our updated implementation, but just in case
        return res.status(500).json({ 
          error: 'Unable to authenticate with Google. Please try again.'
        });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error('Google auth error:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to authenticate with Google'
      });
    }
  });
  
  // POST /api/forgot-password - Initiate password reset
  app.post('/api/forgot-password', async (req: Request, res: Response) => {
    try {
      // Validate request data
      const { email } = forgotPasswordSchema.parse(req.body);
      
      // Create reset token in database
      const token = await storage.createPasswordResetToken(email);
      
      if (!token) {
        // Don't reveal if email exists in DB for security reasons
        return res.json({ 
          message: "If a matching account was found, a password reset link has been sent."
        });
      }
      
      // In a real application, you would send an email with reset token here
      // For this demo, we'll just return the token directly
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
      
      console.log(`Password reset link for ${email}: ${resetLink}`);
      
      return res.json({ 
        message: "Password reset email sent",
        // In a real app, you would remove this and only send the token via email
        resetLink 
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to process request' });
      }
    }
  });
  
  // POST /api/reset-password - Complete password reset
  app.post('/api/reset-password', async (req: Request, res: Response) => {
    try {
      // Validate request data
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      
      // Reset password in database
      const success = await storage.resetPassword(token, newPassword);
      
      if (!success) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }
      
      return res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to reset password' });
      }
    }
  });
  
  // GET /api/user - Get current user info
  app.get('/api/user', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Return user data (excluding password)
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user data' });
    }
  });

  // GET /api/notes - Get notes with optional filters
  app.get('/api/notes', async (req: Request, res: Response) => {
    try {
      // Get user information if authenticated
      let userDepartment: string | undefined;
      let userCollege: string | undefined;
      let userYear: number | undefined;
      
      if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        userDepartment = user?.department;
        userCollege = user?.college || undefined;
        userYear = user?.year;
      }
      
      // Check if we should show notes from all departments or not
      // Make sure to use strict comparison since query params are strings
      const showAllDepartments = req.query.showAllDepartments === 'true';
      const showAllColleges = req.query.showAllColleges === 'true';
      const showAllYears = req.query.showAllYears === 'true';
      
      // Debug the query parameters
      console.log('Query Params:', {
        department: req.query.department,
        subject: req.query.subject,
        showAllDepartments: req.query.showAllDepartments,
        showAllDepartmentsParsed: showAllDepartments,
        showAllColleges: req.query.showAllColleges,
        showAllCollegesParsed: showAllColleges,
        showAllYears: req.query.showAllYears,
        showAllYearsParsed: showAllYears,
        userDepartment,
        userCollege,
        userYear
      });
      
      // Set up query parameters based on filter choices
      const queryParams = searchNotesSchema.parse({
        // If department is explicitly selected in the query, use that department
        department: req.query.department as string | undefined,
        subject: req.query.subject as string | undefined,
        // Include default year value for backward compatibility
        year: (req.query.year ? parseInt(req.query.year as string) : 0), 
        // If no specific department is selected and not showing all departments, restrict to user's department
        userDepartment: !showAllDepartments && !req.query.department ? userDepartment : undefined,
        // Always include user's college for filtering (unless explicitly showing all colleges)
        userCollege: !showAllColleges ? userCollege : undefined,
        // Include user's year for filtering (unless explicitly showing all years)
        userYear: !showAllYears ? userYear : undefined,
        showAllDepartments: showAllDepartments,
        showAllColleges: showAllColleges,
        showAllYears: showAllYears || false // Default to not showing all years
      });
      
      const notes = await storage.getNotes(queryParams);
      res.json(notes);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch notes' });
      }
    }
  });

  // POST /api/notes - Upload a new note (requires authentication)
  app.post('/api/notes', isAuthenticated, upload.single('file'), async (req: Request<any, any, any, any> & { file?: Express.Multer.File }, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Get user information
      // We already checked in isAuthenticated that userId exists
      // Force type assertion with non-null assertion operator
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Enhanced file validation
      const fileValidation = await validateFile(req.file);
      if (!fileValidation.valid) {
        // Remove the file if it didn't pass validation
        fs.unlinkSync(path.join(uploadDir, req.file.filename));
        return res.status(400).json({ error: fileValidation.message });
      }
      
      // Check for duplicate files (simplified, in production would use actual file hashing)
      // Get all notes from this user
      const userDepartment = user.department;
      const existingNotes = await storage.getNotes({ department: userDepartment });
      
      // Check for duplicate filenames
      const isDuplicate = existingNotes.some(note => {
        return note.originalFilename === req.file!.originalname && note.userId === userId;
      });
      
      if (isDuplicate) {
        // Remove the file as it's a duplicate
        fs.unlinkSync(path.join(uploadDir, req.file.filename));
        return res.status(409).json({ 
          error: 'Duplicate file detected',
          message: `A file with the name "${req.file.originalname}" has already been uploaded by you.`
        });
      }

      // Sanitize user input before validation
      const sanitizedTitle = sanitizeUserText(req.body.title);
      const sanitizedSubject = sanitizeUserText(req.body.subject);
      
      // Validate form data with sanitized inputs
      const noteData = insertNoteSchema.parse({
        usn: user.usn, // Use logged-in user's USN
        title: sanitizedTitle,
        department: user.department, // Use logged-in user's department
        year: user.year || 1, // Use the user's year for academic year restriction
        subject: sanitizedSubject,
        filename: req.file.filename,
        originalFilename: req.file.originalname
      });
      
      // Log file uploads for security monitoring
      console.log(`[Security Log] File upload: User=${user.usn}, File=${req.file.originalname}, Type=${req.file.mimetype}, Size=${req.file.size}bytes`);
      
      // Store note metadata in storage
      const note = await storage.createNote(noteData, user.id);
      
      res.status(201).json(note);
    } catch (error) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(path.join(uploadDir, req.file.filename));
      }
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to upload note' });
      }
    }
  });

  // GET /api/notes/:id/view - Increment view count for a note
  app.get('/api/notes/:id/view', async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      // Increment the view count
      await storage.incrementNoteViewCount(noteId);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to track note view' });
    }
  });
  
  // GET /api/notes/:id/download - Download a note by ID
  app.get('/api/notes/:id/download', async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      const crypto = await import('crypto');
      
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const note = await storage.getNoteById(noteId);
      
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      // Require login to download notes and check year restrictions
      if (!req.session.userId) {
        // Log security event for unauthorized download attempt
        const { logSecurityEvent, SecurityEventType, LogSeverity } = await import('./security-logger');
        logSecurityEvent(
          SecurityEventType.ACCESS_DENIED,
          LogSeverity.WARNING,
          req,
          `Unauthorized download attempt for note ID ${noteId}`
        );
        return res.status(401).json({ error: 'Please login to download notes' });
      }
      
      // Check if the user's academic year matches the note's year
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Allow download if years match OR if the showAllYears=true parameter is provided (for admin use)
      const showAllYears = req.query.showAllYears === 'true';
      if (!showAllYears && user.year !== note.year) {
        // Log security event for access control violation
        const { logSecurityEvent, SecurityEventType, LogSeverity } = await import('./security-logger');
        logSecurityEvent(
          SecurityEventType.ACCESS_DENIED,
          LogSeverity.WARNING,
          req,
          `Year mismatch on download attempt: User ${user.usn} (year ${user.year}) tried to download note ${noteId} (year ${note.year})`
        );
        return res.status(403).json({ 
          error: 'Access denied', 
          message: 'You can only download notes from your academic year'
        });
      }
      
      const filePath = path.join(uploadDir, note.filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Increment the download count
      await storage.incrementNoteDownloadCount(noteId);
      
      // Get original filename or use secure fallback
      const sanitizedFilename = note.originalFilename 
        ? note.originalFilename.replace(/[^\w\.\-]/g, '_') // Sanitize filename
        : `note_${noteId}${path.extname(note.filename)}`;
        
      // Determine content type based on file extension
      const fileExtension = path.extname(note.filename).toLowerCase();
      let contentType = 'application/octet-stream'; // Default safe content type
      
      // Map common extensions to content types
      const contentTypeMap: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.txt': 'text/plain',
        '.md': 'text/markdown'
      };
      
      if (contentTypeMap[fileExtension]) {
        contentType = contentTypeMap[fileExtension];
      }
      
      // Calculate file hash for integrity checking
      const fileBuffer = fs.readFileSync(filePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('base64');
      
      // Set enhanced security headers for file download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Add integrity header (similar to SRI concept but for downloads)
      res.setHeader('X-Content-Integrity', `sha256-${fileHash}`);
      
      // Log successful download event
      const { logSecurityEvent, SecurityEventType, LogSeverity } = await import('./security-logger');
      logSecurityEvent(
        SecurityEventType.FILE_SECURITY,
        LogSeverity.INFO,
        req,
        `File download: User ${user.usn} downloaded note ${noteId} (${note.title})`
      );
      
      // Send the file
      res.sendFile(filePath);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Failed to download note' });
    }
  });

  // Configure profile picture upload middleware
  const profilePicStorage = multer.diskStorage({
    destination: function (req: Express.Request, file: Express.Multer.File, cb) {
      const profileDir = path.join(process.cwd(), "uploads/profile");
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }
      cb(null, profileDir);
    },
    filename: function (req: Express.Request, file: Express.Multer.File, cb) {
      // Generate a unique filename while keeping the original extension
      const extension = path.extname(file.originalname);
      const uniqueFilename = `profile_${uuidv4()}${extension}`;
      cb(null, uniqueFilename);
    }
  });

  const profileUpload = multer({
    storage: profilePicStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: function (req: Express.Request, file: Express.Multer.File, cb) {
      // Accept only image files
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPG, PNG, GIF and WebP images are allowed.'));
      }
    }
  });

  // PATCH /api/user/settings - Update user settings
  app.patch('/api/user/settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Validate settings data
      const settingsData = updateUserSettingsSchema.parse(req.body);
      
      // Update user settings
      const updatedUser = await storage.updateUserSettings(req.session.userId, settingsData);
      
      // Return user data (excluding password)
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update settings' });
      }
    }
  });

  // PATCH /api/user/password - Update user password
  app.patch('/api/user/password', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Validate password data
      const passwordData = updatePasswordSchema.parse(req.body);
      
      // Update password
      await storage.updatePassword(
        req.session.userId,
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ error: validationError.message });
      } else if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update password' });
      }
    }
  });

  // POST /api/user/profile-picture - Upload profile picture
  app.post('/api/user/profile-picture', isAuthenticated, profileUpload.single('profilePicture'), async (req: Request<any, any, any, any> & { file?: Express.Multer.File }, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Update user profile picture in database
      const updatedUser = await storage.updateProfilePicture(
        req.session.userId,
        req.file.filename
      );
      
      // Return user data (excluding password)
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      // Clean up uploaded file if there's an error
      if (req.file) {
        fs.unlinkSync(path.join(uploadDir, 'profile', req.file.filename));
      }
      
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to upload profile picture' });
      }
    }
  });

  // GET /api/user/profile-picture/:filename - Get profile picture
  app.get('/api/user/profile-picture/:filename', async (req: Request, res: Response) => {
    try {
      // Sanitize and validate the filename to prevent path traversal
      const filename = req.params.filename;
      
      // Only allow filenames matching the pattern: profile_UUID.extension
      if (!filename.match(/^profile_[a-f0-9\-]{36}\.(jpg|jpeg|png|gif|webp)$/i)) {
        return res.status(400).json({ error: 'Invalid filename format' });
      }
      
      const filePath = path.join(process.cwd(), 'uploads/profile', filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Profile picture not found' });
      }
      
      // Determine content type based on file extension
      const fileExtension = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream'; // Default content type
      
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };
      
      if (contentTypeMap[fileExtension]) {
        contentType = contentTypeMap[fileExtension];
      }
      
      // Set security headers for image
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'self'");
      res.setHeader('Cache-Control', 'max-age=86400'); // Cache for 1 day (profile pictures don't change often)
      
      // Send the file
      res.sendFile(filePath);
    } catch (error) {
      console.error('Profile picture error:', error);
      res.status(500).json({ error: 'Failed to get profile picture' });
    }
  });
  
  // Content moderation and flagging routes
  
  // POST /api/notes/:id/flag - Flag a note as suspicious
  app.post('/api/notes/:id/flag', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      // Extract and sanitize the reason
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        return res.status(400).json({ error: 'Please provide a reason for flagging this content' });
      }
      
      // Sanitize the reason to prevent XSS
      const sanitizedReason = sanitizeUserText(reason);
      
      // Check if note exists
      const note = await storage.getNoteById(noteId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      // Get user information
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Check if the user's department matches the note's department
      if (user.department !== note.department) {
        return res.status(403).json({ 
          error: 'Permission denied', 
          message: 'You can only flag notes from your own department'
        });
      }
      
      console.log(`[Security Log] Note flagged: ID=${noteId}, Flagger=${user.usn}, Reason=${sanitizedReason}`);
      
      // Flag the note with sanitized reason
      const flaggedNote = await storage.flagNote(noteId, sanitizedReason);
      
      res.json({ 
        message: 'Note has been flagged for review',
        note: flaggedNote
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to flag note' });
      }
    }
  });
  
  // GET /api/notes/flagged - Get all flagged notes (available to any authenticated user)
  app.get('/api/notes/flagged', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      // Any authenticated user can access moderation features
      if (!user) {
        return res.status(403).json({ error: 'You do not have permission to access this resource' });
      }
      
      // Get all flagged notes
      const flaggedNotes = await storage.getFlaggedNotes();
      
      res.json(flaggedNotes);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get flagged notes' });
      }
    }
  });
  
  // POST /api/notes/:id/review - Review a flagged note (available to any authenticated user)
  app.post('/api/notes/:id/review', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      
      if (isNaN(noteId)) {
        return res.status(400).json({ error: 'Invalid note ID' });
      }
      
      const { approved } = req.body;
      if (typeof approved !== 'boolean') {
        return res.status(400).json({ error: 'Please specify whether the note is approved (true) or rejected (false)' });
      }
      
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      // Any authenticated user can review flagged content
      if (!user) {
        return res.status(403).json({ error: 'You do not have permission to access this resource' });
      }
      
      // Check if note exists and is flagged
      const note = await storage.getNoteById(noteId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      if (!note.isFlagged) {
        return res.status(400).json({ error: 'This note is not flagged for review' });
      }
      
      // Log the review action
      console.log(`[Security Log] Note review: ID=${noteId}, Reviewer=${user.usn}, Decision=${approved ? 'Approved' : 'Rejected'}`);
      
      // Process the review
      const reviewedNote = await storage.reviewFlaggedNote(noteId, approved);
      
      if (approved) {
        res.json({ 
          message: 'Note has been approved and is now available',
          note: reviewedNote
        });
      } else {
        res.json({ 
          message: 'Note has been rejected and removed from the system',
          note: reviewedNote
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to review note' });
      }
    }
  });
  
  // Get user stats for achievements
  app.get('/api/user/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      
      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get user's notes
      const userNotes = await storage.getNotes({
        userId: userId
      });
      
      // Get days since joined
      const daysSinceJoined = Math.floor(
        (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Get all notes viewed or downloaded by user
      // For demonstration, we'll use random values since we don't have actual tracking yet
      // In a real implementation, these would come from the database
      
      // Get total note views by user
      const viewCount = Math.floor(Math.random() * 30); // Mock data for demo
      
      // Get total note downloads by user
      const downloadCount = Math.floor(Math.random() * 15); // Mock data for demo
      
      // Get number of previews user has seen using hover feature
      const previewCount = Math.floor(Math.random() * 40); // Mock data for demo
      
      // Get number of unique subjects user has viewed
      // In real implementation, this would be a database query with COUNT(DISTINCT subject)
      const uniqueSubjectsCount = Math.floor(Math.random() * 10); // Mock data for demo
      
      // Get number of different pages user has visited in app
      // In real implementation, this would be tracked with analytics
      const pagesVisited = Math.floor(Math.random() * 6); // Mock data for demo
      
      // Return complete stats for achievement badges
      const stats = {
        uploadCount: userNotes.length,
        downloadCount,
        viewCount,
        daysSinceJoined,
        previewCount,
        uniqueSubjectsCount,
        pagesVisited
      };
      
      // Log stats for debugging
      console.log(`User stats for ${user.usn}:`, stats);
      
      return res.json(stats);
    } catch (error) {
      console.error("Error getting user stats:", error);
      return res.status(500).json({ error: "Failed to get user stats" });
    }
  });

  // Admin route - Generate security report
  // This is an admin-only route protected by authentication
  app.get('/api/admin/security-report', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      // Only users with USN starting with 'admin' can access this report
      // In a real application, use a proper role-based access control system
      if (!user || !user.usn.startsWith('admin')) {
        // Log unauthorized access attempt
        const { logSecurityEvent, SecurityEventType, LogSeverity } = await import('./security-logger');
        logSecurityEvent(
          SecurityEventType.ACCESS_DENIED,
          LogSeverity.WARNING,
          req,
          `Unauthorized access attempt to security report by user ${user?.usn || 'unknown'}`
        );
        return res.status(403).json({ error: 'You do not have permission to access this resource' });
      }
      
      // Import and generate the security report
      const { generateSecurityReport } = await import('./security-report');
      const report = generateSecurityReport();
      
      // Log report generation
      console.log(`Security report generated by admin user ${user.usn}`);
      
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="security-report.md"');
      res.send(report);
    } catch (error) {
      console.error('Error generating security report:', error);
      res.status(500).json({ error: 'Failed to generate security report' });
    }
  });

  const httpServer = createServer(app);
  
  // Create WebSocket server with a separate path to avoid conflicts with Vite's HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active drawing connections
  const connections = new Map<string, WebSocket[]>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket connection established');
    let drawingId: string = "";
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle join drawing room message
        if (data.type === 'join' && data.drawingId) {
          // Ensure drawingId is a string
          drawingId = String(data.drawingId);
          
          // Initialize connections array for this drawing if it doesn't exist
          if (!connections.has(drawingId)) {
            connections.set(drawingId, []);
          }
          
          // Add this connection to the drawing's connections
          const drawingConnections = connections.get(drawingId) || [];
          drawingConnections.push(ws);
          connections.set(drawingId, drawingConnections);
          
          console.log(`Client joined drawing: ${drawingId}, total clients: ${drawingConnections.length}`);
          
          // Inform the client they've joined successfully
          ws.send(JSON.stringify({
            type: 'joined',
            drawingId,
            clients: drawingConnections.length
          }));
        }
        
        // Handle drawing data updates
        if (data.type === 'draw' && drawingId) {
          // Broadcast to all clients in this drawing except the sender
          const drawingConnections = connections.get(drawingId) || [];
          
          drawingConnections.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'draw',
                drawData: data.drawData
              }));
            }
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      
      // Remove connection from drawing room
      if (drawingId) {
        const drawingConnections = connections.get(drawingId) || [];
        const updatedConnections = drawingConnections.filter(client => client !== ws);
        
        if (updatedConnections.length === 0) {
          // If no clients left in this drawing, remove the drawing entry
          connections.delete(drawingId);
          console.log(`Drawing room ${drawingId} closed (no clients)`);
        } else {
          // Update the connections for this drawing
          connections.set(drawingId, updatedConnections);
          console.log(`Client left drawing ${drawingId}, remaining clients: ${updatedConnections.length}`);
          
          // Inform remaining clients about the disconnection
          updatedConnections.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'clientLeft',
                clients: updatedConnections.length
              }));
            }
          });
        }
      }
    });
  });
  
  return httpServer;
}
