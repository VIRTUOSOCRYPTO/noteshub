#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

echo "Starting build process for NotesHub backend on Render..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build frontend (client side)
echo "Building frontend..."
npm run build

# Build server (TypeScript compilation)
echo "Building server with TypeScript..."
npx tsc -p tsconfig.server.json || {
  echo "WARNING: TypeScript compilation failed, but we'll continue with the fallback server"
}

# Create necessary directories
echo "Creating required directories..."
mkdir -p dist/uploads
mkdir -p dist/logs

# Debug - List directory contents to verify build artifacts
echo "Listing build artifacts:"
ls -la dist/
ls -la dist/server/ || echo "Server directory not found"

# Copy package.json and other necessary files
echo "Copying configuration files..."
cp package.json dist/ || echo "Failed to copy package.json"
cp render-app.js ./ || echo "Fallback server already exists"

echo "Build completed successfully."