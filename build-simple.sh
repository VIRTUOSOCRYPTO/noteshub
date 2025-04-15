#!/bin/bash
# Super simple build script for Render that doesn't depend on npm run build

echo "Using simplified build process for Render..."

# Copy the simplified package.json
cp package-render.json package.json

# Install dependencies
npm install express cors pg multer bcryptjs dotenv path

# Create necessary directories
mkdir -p uploads
chmod 777 uploads

# Create a simple server.js file with the API endpoints
cat > server.js << 'EOL'
// Simple API server for Render deployment
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: '*', // Allow any origin for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON parsing
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only PDFs, documents, and common image formats
    const allowedFileTypes = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|jpg|jpeg|png/;
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Office documents, and image files are allowed.'));
    }
  }
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

// In-memory data for testing when no database is available
const mockNotes = [
  {
    id: 1,
    title: 'Introduction to Computer Science',
    description: 'Basics of computing and programming concepts',
    subject: 'Computer Science',
    semester: '1',
    fileUrl: '/uploads/sample-note-1.pdf',
    userId: 1,
    views: 235,
    downloads: 87,
    createdAt: '2023-11-10T08:30:00Z',
    tags: ['programming', 'basics', 'algorithms']
  },
  {
    id: 2,
    title: 'Advanced Data Structures',
    description: 'Complex data structures and their applications',
    subject: 'Data Structures',
    semester: '3',
    fileUrl: '/uploads/sample-note-2.pdf',
    userId: 1,
    views: 142,
    downloads: 53,
    createdAt: '2023-12-05T14:22:00Z',
    tags: ['data-structures', 'algorithms', 'efficiency']
  },
  {
    id: 3,
    title: 'Database Management Systems',
    description: 'Fundamentals of database design and SQL',
    subject: 'Databases',
    semester: '4',
    fileUrl: '/uploads/sample-note-3.pdf',
    userId: 2,
    views: 189,
    downloads: 62,
    createdAt: '2024-01-15T11:45:00Z',
    tags: ['sql', 'database-design', 'normalization']
  }
];

const mockUsers = [
  {
    id: 1,
    usn: 'DEMO12345',
    department: 'CSE',
    college: 'Example College',
    email: 'test@example.com',
    notifyNewNotes: true,
    notifyDownloads: false
  },
  {
    id: 2,
    usn: 'DEMO67890',
    department: 'ISE',
    college: 'Sample University',
    email: 'user2@example.com',
    notifyNewNotes: false,
    notifyDownloads: true
  }
];

// API routes
app.get('/', (req, res) => {
  res.json({
    message: 'NotesHub API is running',
    status: 'ok',
    endpoints: [
      '/api/test - Test API connection',
      '/api/user - Get user data (no auth needed for testing)',
      '/api/login - Login form (GET) and login (POST)',
      '/api/register - Registration form (GET) and registration (POST)',
      '/api/notes - Get all notes (GET) or create note (POST)',
      '/api/notes/:id - Get specific note details',
      '/api/notes/:id/download - Download a note',
      '/api/notes/:id/view - Increment view count for a note'
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
  res.json(mockUsers[0]);
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
      user: mockUsers[0],
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
    department: req.body.department || 'CSE',
    message: 'Registration successful'
  });
});

// Notes endpoints
app.get('/api/notes', async (req, res) => {
  try {
    // Query parameters for filtering
    const { subject, semester, search, userId } = req.query;
    
    // If we have a database connection, use it
    if (pool) {
      let query = 'SELECT * FROM notes WHERE 1=1';
      const params = [];
      
      if (subject) {
        params.push(subject);
        query += ` AND subject = $${params.length}`;
      }
      
      if (semester) {
        params.push(semester);
        query += ` AND semester = $${params.length}`;
      }
      
      if (search) {
        params.push(`%${search}%`);
        query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
      }
      
      if (userId) {
        params.push(parseInt(userId));
        query += ` AND "userId" = $${params.length}`;
      }
      
      query += ' ORDER BY "createdAt" DESC';
      
      const result = await pool.query(query, params);
      return res.json(result.rows);
    } 
    
    // Otherwise use mock data
    let filteredNotes = [...mockNotes];
    
    if (subject) {
      filteredNotes = filteredNotes.filter(note => 
        note.subject.toLowerCase() === subject.toLowerCase());
    }
    
    if (semester) {
      filteredNotes = filteredNotes.filter(note => 
        note.semester === semester);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredNotes = filteredNotes.filter(note => 
        note.title.toLowerCase().includes(searchLower) || 
        note.description.toLowerCase().includes(searchLower));
    }
    
    if (userId) {
      filteredNotes = filteredNotes.filter(note => 
        note.userId === parseInt(userId));
    }
    
    // Sort by created date, newest first
    filteredNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(filteredNotes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes', details: err.message });
  }
});

app.get('/api/notes/:id', async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    
    if (pool) {
      const result = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }
      return res.json(result.rows[0]);
    }
    
    // Use mock data if no database
    const note = mockNotes.find(n => n.id === noteId);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(note);
  } catch (err) {
    console.error('Error fetching note:', err);
    res.status(500).json({ error: 'Failed to fetch note', details: err.message });
  }
});

app.post('/api/notes', upload.single('file'), async (req, res) => {
  try {
    // Get user ID from auth token (stub for now)
    const userId = 1; // Demo user ID
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { title, description, subject, semester, tags } = req.body;
    
    // Validate required fields
    if (!title || !subject || !semester) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['title', 'subject', 'semester']
      });
    }
    
    // Process tags if provided
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        // If tags is a string, split by comma
        parsedTags = tags.split(',').map(tag => tag.trim());
      }
    }
    
    if (pool) {
      // Generate file URL
      const fileUrl = `/uploads/${req.file.filename}`;
      
      // Insert into database
      const result = await pool.query(
        `INSERT INTO notes (title, description, subject, semester, "fileUrl", "userId", tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [title, description, subject, semester, fileUrl, userId, parsedTags]
      );
      
      return res.status(201).json(result.rows[0]);
    }
    
    // If no database, return mock response
    const newNote = {
      id: mockNotes.length + 1,
      title,
      description: description || '',
      subject,
      semester,
      fileUrl: `/uploads/${req.file.filename}`,
      userId,
      views: 0,
      downloads: 0,
      createdAt: new Date().toISOString(),
      tags: parsedTags
    };
    
    mockNotes.push(newNote);
    res.status(201).json(newNote);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note', details: err.message });
  }
});

app.get('/api/notes/:id/view', async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    
    if (pool) {
      // Increment view count in database
      await pool.query(
        'UPDATE notes SET views = views + 1 WHERE id = $1',
        [noteId]
      );
      
      // Get updated note
      const result = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      return res.json(result.rows[0]);
    }
    
    // Use mock data if no database
    const noteIndex = mockNotes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Increment view count
    mockNotes[noteIndex].views += 1;
    
    res.json(mockNotes[noteIndex]);
  } catch (err) {
    console.error('Error updating view count:', err);
    res.status(500).json({ error: 'Failed to update view count', details: err.message });
  }
});

app.get('/api/notes/:id/download', async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    
    if (pool) {
      // Increment download count in database
      await pool.query(
        'UPDATE notes SET downloads = downloads + 1 WHERE id = $1',
        [noteId]
      );
      
      // Get the note to find file path
      const result = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      const note = result.rows[0];
      
      // In a real implementation, we would send the file here
      // For now, return success message with file path
      return res.json({
        message: 'Download count incremented',
        note,
        downloadUrl: note.fileUrl
      });
    }
    
    // Use mock data if no database
    const noteIndex = mockNotes.findIndex(n => n.id === noteId);
    
    if (noteIndex === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Increment download count
    mockNotes[noteIndex].downloads += 1;
    
    // In a real implementation, we would send the file
    // For now, return success message with file path
    res.json({
      message: 'Download count incremented',
      note: mockNotes[noteIndex],
      downloadUrl: mockNotes[noteIndex].fileUrl
    });
  } catch (err) {
    console.error('Error updating download count:', err);
    res.status(500).json({ error: 'Failed to update download count', details: err.message });
  }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

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
