#!/bin/bash
# Install dependencies
npm ci

# Build frontend
npm run build

# Build server
npx tsc -p tsconfig.server.json

# Create necessary directories
mkdir -p dist/uploads
mkdir -p dist/logs