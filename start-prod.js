// Production starter script for Render
// This avoids TypeScript execution issues by using compiled JS
import { spawn } from 'child_process';

// Set production environment
process.env.NODE_ENV = 'production';

console.log('Starting NotesHub in production mode');

try {
  // First try to use tsx to run TypeScript directly
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: process.env
  });
  
  server.on('error', (err) => {
    console.error('Failed to start with tsx:', err);
    process.exit(1);
  });
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}
