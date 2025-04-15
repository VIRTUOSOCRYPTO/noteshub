const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Set up database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for some services like Render
  }
});

// Configure CORS - THIS IS CRITICAL FOR YOUR FRONTEND
app.use(cors({
  // Allow your frontend domain
  origin: [
    'https://notezhub.onrender.com',
    'https://notezhub.web.app',
    'https://notezhub.firebaseapp.com',
    // Allow local development as well
    'http://localhost:3000', 
    'http://localhost:5173',
    'http://localhost:5000',
    'http://localhost:8000',
    // You can add more origins as needed
  ],
  // Important - allows cookies to be sent cross-domain
  credentials: true,
  // Allow all common methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // Allow common headers
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  // Expose CORS headers to the browser
  exposedHeaders: ['Access-Control-Allow-Origin']
}));

// Required for parsing JSON bodies
app.use(express.json());

// Add logging middleware to help diagnose issues
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  // Log headers in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Request headers:', req.headers);
  }
  
  // Capture original send method
  const originalSend = res.send;
  
  // Override send method to log response
  res.send = function(body) {
    console.log(`[${new Date().toISOString()}] Response ${res.statusCode}`);
    return originalSend.call(this, body);
  };
  
  next();
});

// Middleware to verify JWT token (simplified)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  
  try {
    // In a real app, you'd verify the token with jwt.verify
    // For this example we're just checking if it exists
    req.user = { id: 1, usn: 'DEMO12345' }; // Mock user data
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Optional authentication middleware for development - allows bypassing auth for testing
function optionalAuth(req, res, next) {
  // Check for Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  // Check for development bypass header
  const bypassAuth = req.headers['x-dev-bypass-auth'] === 'true';
  
  if (token) {
    try {
      // In a real app, you'd verify the token
      req.user = { id: 1, usn: 'DEMO12345' };
    } catch (err) {
      // Token invalid but we'll continue anyway in optional mode
      console.log('Invalid token in optional auth, continuing without user');
      req.user = null;
    }
  } else if (bypassAuth && process.env.NODE_ENV !== 'production') {
    // Only allow bypass in development
    console.log('Auth bypassed for development');
    req.user = { id: 1, usn: 'DEMO12345' };
  } else {
    req.user = null;
  }
  
  next();
}

// Basic endpoints needed by your application

// Test endpoints to verify API is working
app.get('/', (req, res) => {
  res.json({
    message: 'NotesHub API is running',
    status: 'ok',
    endpoints: [
      '/api/test - Test API connection',
      '/api/db-test - Test database connection',
      '/api/notes - Get all notes',
      '/api/user - Get current user (requires auth)',
      '/api/user-test - Get mock user (no auth required, for testing)',
      '/api/login - Login form data (GET) and login endpoint (POST)',
      '/api/register - Registration form data (GET) and registration endpoint (POST)',
      '/api/cors-debug - Debug CORS configuration'
    ],
    testing: {
      development: 'In development mode, set NODE_ENV=development',
      mockUser: 'For a mock user in development, use /api/user?mockuser=true',
      demoCredentials: {
        usn: 'DEMO12345',
        password: 'Password123!'
      }
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API Test successful',
    cors: 'enabled',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      message: 'Database connection successful',
      timestamp: result.rows[0].now
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Database connection failed',
      details: err.message
    });
  }
});

// Notes API - Simplified version
app.get('/api/notes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notes LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting notes:', err);
    res.status(500).json({ error: 'Failed to retrieve notes' });
  }
});

// User API - Return user info if authenticated
app.get('/api/user', optionalAuth, (req, res) => {
  // In development mode, we'll return a mock user even without auth
  // In production, we require proper authentication
  
  if (!req.user) {
    if (process.env.NODE_ENV === 'development' && req.query.mockuser === 'true') {
      // For development testing only - return a mock user
      return res.json({
        id: 999,
        usn: 'TESTUSER123',
        department: 'CSE',
        college: 'Test College',
        email: 'test@example.com',
        profilePicture: null,
        notifyNewNotes: true,
        notifyDownloads: false,
        year: 2,
        _note: 'This is a mock user for development only'
      });
    }
    
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // User is authenticated - return user info
  res.json({
    id: req.user.id,
    usn: req.user.usn,
    department: 'CSE',
    college: 'Example College',
    email: 'user@example.com',
    profilePicture: null,
    notifyNewNotes: true,
    notifyDownloads: false,
    year: 3
  });
});

// Alternative route that always returns user data (for testing)
app.get('/api/user-test', (req, res) => {
  res.json({
    id: 1,
    usn: 'DEMO12345',
    department: 'CSE',
    college: 'Example College',
    email: 'user@example.com',
    profilePicture: null,
    notifyNewNotes: true,
    notifyDownloads: false,
    year: 3,
    _note: 'This endpoint always returns data without authentication (for testing)'
  });
});

// Login API endpoint
app.post('/api/login', async (req, res) => {
  const { usn, password } = req.body;
  
  if (!usn || !password) {
    return res.status(400).json({ error: 'USN and password are required' });
  }
  
  try {
    // In a real app, you would fetch the user from the database and compare password hashes
    // For this example, we're returning a simplified response
    
    // Check for demo credentials
    if (usn === 'DEMO12345' && password === 'Password123!') {
      return res.json({
        user: {
          id: 1,
          usn: 'DEMO12345',
          department: 'CSE',
          college: 'Example College',
          email: 'user@example.com',
          profilePicture: null,
          notifyNewNotes: true,
          notifyDownloads: false
        },
        accessToken: 'demo-access-token',
        refreshToken: 'demo-refresh-token'
      });
    }
    
    // Try to find user in database
    const userResult = await pool.query('SELECT * FROM users WHERE usn = $1', [usn.toUpperCase()]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'USN not registered. Please register first.' });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }
    
    // Don't send password back to client
    delete user.password;
    
    // In a real app, you would generate JWT tokens here
    res.json({
      user,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token'
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed due to server error' });
  }
});

// Register API endpoint
app.post('/api/register', async (req, res) => {
  const { usn, email, department, college, year, password } = req.body;
  
  if (!usn || !email || !department || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE usn = $1 OR email = $2', [usn.toUpperCase(), email]);
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this USN or email already exists' });
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // In a real app, you would insert the user into the database
    // For this example, we're returning a simplified response
    const user = {
      id: 1,
      usn: usn.toUpperCase(),
      email,
      department,
      college,
      year,
      profilePicture: null,
      notifyNewNotes: true,
      notifyDownloads: false,
      createdAt: new Date()
    };
    
    res.status(201).json(user);
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed due to server error' });
  }
});

// GET method for login form (for testing)
app.get('/api/login', (req, res) => {
  res.json({
    message: 'Login form data',
    howTo: 'Make a POST request to this endpoint with usn and password fields',
    demoCredentials: {
      usn: 'DEMO12345',
      password: 'Password123!'
    },
    formFields: [
      {
        name: 'usn',
        type: 'text',
        required: true,
        description: 'University Serial Number'
      },
      {
        name: 'password',
        type: 'password',
        required: true,
        description: 'User password'
      }
    ]
  });
});

// GET method for register form (for testing)
app.get('/api/register', (req, res) => {
  res.json({
    message: 'Registration form data',
    howTo: 'Make a POST request to this endpoint with the required fields',
    formFields: [
      {
        name: 'usn',
        type: 'text',
        required: true,
        description: 'University Serial Number (e.g., 1SI20CS045)'
      },
      {
        name: 'email',
        type: 'email',
        required: true,
        description: 'Valid email address'
      },
      {
        name: 'department',
        type: 'select',
        required: true,
        description: 'Academic department',
        options: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'ISE', 'AIML', 'AIDS']
      },
      {
        name: 'college',
        type: 'select',
        required: true,
        description: 'College name',
        options: ['rvce', 'msrit', 'bmsce', 'pesu', 'other']
      },
      {
        name: 'year',
        type: 'select',
        required: true,
        description: 'Academic year',
        options: [1, 2, 3, 4]
      },
      {
        name: 'password',
        type: 'password',
        required: true,
        description: 'Password (min 8 chars, with uppercase, lowercase, number, special char)'
      },
      {
        name: 'confirmPassword',
        type: 'password',
        required: true,
        description: 'Confirm password (must match password)'
      }
    ]
  });
});

// Route with CORS debug info
app.get('/api/cors-debug', (req, res) => {
  res.json({
    message: 'CORS Debug Info',
    requestHeaders: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host
    },
    responseHeaders: res.getHeaders(),
    corsEnabled: true
  });
});

// Start the server
app.listen(port, () => {
  console.log(`NotesHub API server running on port ${port}`);
  console.log(`CORS enabled for cross-origin requests`);
});
