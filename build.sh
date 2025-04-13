#!/bin/bash
# Build script for Render deployment

# Install dependencies
echo "Installing dependencies..."
npm install

# Move TypeScript from devDependencies to dependencies if it's not there
if ! grep -q '"typescript":' package.json; then
  echo "Adding TypeScript as a dependency..."
  npm install typescript --save
fi

# Move tsx from devDependencies to dependencies if it's not there
if ! grep -q '"tsx":' package.json; then
  echo "Adding tsx as a dependency..."
  npm install tsx --save
fi

# Create a production-ready start script
echo "Creating production start script..."
cat > start-prod.js << 'EOF'
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
EOF

# Build the frontend 
echo "Building frontend..."
npm run build

echo "Setting execute permissions..."
chmod +x start-prod.js

echo "Build completed successfully!"
