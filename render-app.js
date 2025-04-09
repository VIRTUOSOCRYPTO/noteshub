/**
 * Simplified server file for Render deployment
 * 
 * This is a fallback server that will run if the TypeScript build fails
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 10000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files if they exist
if (fs.existsSync(path.join(__dirname, 'dist/client'))) {
  app.use(express.static(path.join(__dirname, 'dist/client')));
}

// Basic routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>NotesHub API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>NotesHub API Server</h1>
        <p>The NotesHub API is running successfully.</p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <h2>Server Information:</h2>
        <pre>
Node.js: ${process.version}
Directory: ${__dirname}
Build directory exists: ${fs.existsSync(path.join(__dirname, 'dist')) ? 'Yes' : 'No'}
Server files exist: ${fs.existsSync(path.join(__dirname, 'dist/server')) ? 'Yes' : 'No'}
        </pre>
      </body>
    </html>
  `);
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working properly', timestamp: new Date().toISOString() });
});

// Catch-all route
app.get('*', (req, res) => {
  res.status(404).send('Not Found - NotesHub API Server');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`NotesHub fallback server running on port ${PORT}`);
});