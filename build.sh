#!/bin/bash

# Install dependencies
npm install

# Compile TypeScript (if needed)
npx tsc --skipLibCheck

# Build the client
npm run build

# Run database migrations
npx drizzle-kit push

# Create necessary directories if they don't exist
mkdir -p uploads
mkdir -p logs
mkdir -p attached_assets

echo "Build process completed!"
