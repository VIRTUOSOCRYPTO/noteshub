#!/bin/bash

# Exit on error
set -e

echo "🔧 Preparing backend for production deployment on Replit..."

# Make sure we have all dependencies installed
echo "📦 Installing dependencies..."
npm install

# Create a .env file with production settings if it doesn't exist
if [ ! -f .env ]; then
  echo "📄 Creating .env file with production settings..."
  cp .env.production .env
  # Update PORT to use Replit's default port
  echo "PORT=8080" >> .env
fi

echo "✅ Backend preparation complete!"
echo ""
echo "🚀 To run the backend in production mode:"
echo "  1. Make sure all required Secrets are set in Replit"
echo "      - DATABASE_URL"
echo "      - SUPABASE_URL"
echo "      - SUPABASE_KEY"
echo "  2. Run: npm start"
echo ""
echo "⚠️ Important: After deploying your frontend to Firebase,"
echo "   make sure to add your Firebase domain to the CORS allowed origins in server/index.ts"