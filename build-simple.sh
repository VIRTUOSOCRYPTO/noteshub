#!/bin/bash
# Super simple build script for Render that doesn't depend on npm run build

echo "Using simplified build process for Render..."

# Copy the simplified package.json
cp package-render.json package.json

# Install dependencies
npm install express cors pg multer bcryptjs dotenv

# Create necessary directories
mkdir -p uploads

# Create a simple server.js file with the API endpoints
cat > server.js << 'EOL'
// Simple API server for Render deployment
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: '*', // Allow any origin for testing
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON parsing
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Database connection (if DATABASE_URL is available)
let pool;
try {
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log('Database connection configured');
  } else {
    console.log('No DATABASE_URL found - running without database');
  }
} catch (err) {
  console.error('Error setting up database:', err.message);
}

// API routes
app.get('/', (req, res) => {
  res.json({
    message: 'NotesHub API is running',
    status: 'ok',
    endpoints: [
      '/api/test - Test API connection',
      '/api/user - Get user data (no auth needed for testing)',
      '/api/login - Login form (GET) and login (POST)',
      '/api/register - Registration form (GET) and registration (POST)'
    ]
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API test successful',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/user', (req, res) => {
  res.json({
    id: 1,
    usn: 'DEMO12345',
    department: 'CSE',
    college: 'Example College',
    email: 'test@example.com',
    notifyNewNotes: true,
    notifyDownloads: false,
    _note: 'This is test data for API verification'
  });
});

app.get('/api/login', (req, res) => {
  res.json({
    message: 'Login form data',
    howTo: 'Make a POST request to this endpoint with usn and password fields',
    demoCredentials: {
      usn: 'DEMO12345',
      password: 'Password123!'
    },
    formFields: [
      { name: 'usn', type: 'text', required: true },
      { name: 'password', type: 'password', required: true }
    ]
  });
});

app.post('/api/login', (req, res) => {
  const { usn, password } = req.body;
  
  if (usn === 'DEMO12345' && password === 'Password123!') {
    res.json({
      user: {
        id: 1,
        usn: 'DEMO12345',
        department: 'CSE',
        college: 'Example College',
        email: 'test@example.com'
      },
      token: 'demo-token-123'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/register', (req, res) => {
  res.json({
    message: 'Registration form data',
    formFields: [
      { name: 'usn', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'department', type: 'text', required: true },
      { name: 'password', type: 'password', required: true }
    ]
  });
});

app.post('/api/register', (req, res) => {
  res.status(201).json({
    id: 2,
    usn: req.body.usn || 'NEW12345',
    email: req.body.email || 'new@example.com',
    message: 'Registration successful'
  });
});

// Database test endpoint
app.get('/api/db-test', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  
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

// Start the server
app.listen(port, () => {
  console.log(`NotesHub API server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
EOL

# Make server.js executable
chmod +x server.js

echo "Build completed successfully."
