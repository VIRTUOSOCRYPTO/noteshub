#!/bin/bash
# Super simple build script for Render that doesn't depend on npm run build

echo "Using simplified build process for Render..."

# Copy the simplified package.json
cp package-render.json package.json

# Install only the dependencies needed for the server.js
npm install express cors pg multer

# Create necessary directories
mkdir -p uploads

echo "Build completed successfully."
