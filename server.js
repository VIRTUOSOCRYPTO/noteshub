/**
 * NotesHub Backend - Simple Express Server for Render Deployment
 * 
 * This is a simplified version of the backend that will work on Render's free tier
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Create Express app
const app = express();
const PORT = process.env.PORT || 10000;

// Configure database connection
let pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Render's PostgreSQL
    }
  });
  console.log('Database connection pool initialized');
} catch (err) {
  console.error('Failed to initialize database pool:', err);
}

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS with more permissive settings for API server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow requests from any domain
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory at:', uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Basic health check route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>NotesHub API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
          .endpoints { margin-top: 20px; }
          .endpoint { margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
          .method { font-weight: bold; color: #0066cc; }
        </style>
      </head>
      <body>
        <h1>NotesHub API Server</h1>
        <p>The NotesHub API is running successfully on Render.</p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        
        <h2>Server Information:</h2>
        <pre>
Node.js: ${process.version}
Time: ${new Date().toISOString()}
Database Connected: ${Boolean(pool)}
        </pre>
        
        <div class="endpoints">
          <h2>Available API Endpoints:</h2>
          <div class="endpoint">
            <span class="method">GET</span> /api/test - Test API connection
          </div>
          <div class="endpoint">
            <span class="method">GET</span> /api/db-test - Test database connection
          </div>
          <div class="endpoint">
            <span class="method">GET</span> /api/notes - Fetch all notes
          </div>
        </div>
      </body>
    </html>
  `);
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working properly', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    service: 'NotesHub Backend on Render'
  });
});

// Database test endpoint
app.get('/api/db-test', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ 
      error: 'Database connection not configured',
      message: 'Database connection pool is not initialized'
    });
  }
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    const currentTime = result.rows[0];
    client.release();
    
    res.json({ 
      message: 'Database connection successful', 
      databaseTime: currentTime.time,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ 
      error: 'Database connection failed', 
      message: err.message
    });
  }
});

// Notes API - Get all notes
app.get('/api/notes', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  try {
    const client = await pool.connect();
    
    // Adapt the query to match your actual schema
    const result = await client.query(`
      SELECT n.*, u.usn, u.email, u.department 
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.is_flagged = false OR n.is_approved = true
      ORDER BY n.id DESC LIMIT 20
    `);
    
    const notes = result.rows;
    client.release();
    
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ 
      error: 'Failed to fetch notes',
      message: err.message
    });
  }
});

// Notes API - Get note by ID
app.get('/api/notes/:id', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  const noteId = req.params.id;
  
  try {
    const client = await pool.connect();
    
    // Adapt the query to match your actual schema
    const result = await client.query(`
      SELECT n.*, u.usn, u.email, u.department 
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.id = $1
    `, [noteId]);
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const note = result.rows[0];
    
    // Increment view count
    await client.query(`
      UPDATE notes SET view_count = view_count + 1 WHERE id = $1
    `, [noteId]);
    
    client.release();
    
    res.json(note);
  } catch (err) {
    console.error('Error fetching note:', err);
    res.status(500).json({ 
      error: 'Failed to fetch note',
      message: err.message
    });
  }
});

// Catch-all handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`NotesHub server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Date: ${new Date().toISOString()}`);
});
