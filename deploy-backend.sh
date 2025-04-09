#!/bin/bash

# Script to prepare the backend for deployment to Replit
# This script helps set up the necessary environment and build steps

echo "Preparing backend for Replit deployment..."

# Make sure production dependencies are installed
npm install

# Create a production .env file if it doesn't exist
if [ ! -f .env.production ]; then
  echo "Creating .env.production file..."
  cp .env.example .env.production
  echo ""
  echo "Please edit .env.production with your actual database credentials!"
  echo ""
fi

# Instructions for Replit deployment
echo "========================================================"
echo "              BACKEND DEPLOYMENT GUIDE                  "
echo "========================================================"
echo ""
echo "To deploy your backend on Replit:"
echo ""
echo "1. Create a new Nix Repl on Replit"
echo "2. Import this repository or copy the files"
echo "3. Set up your environment variables in Replit's Secrets panel:"
echo "   - DATABASE_URL"
echo "   - NODE_ENV=production"
echo "   - All other required environment variables"
echo ""
echo "4. Install dependencies with: npm install"
echo ""
echo "5. Start the server with: npm run dev"
echo ""
echo "6. Your backend will be available at your Replit URL:"
echo "   https://your-project-name.your-username.repl.co"
echo ""
echo "7. Update client/src/lib/api.ts with your Replit URL before deploying the frontend"
echo ""
echo "========================================================"
echo "Remember to keep your Replit project alive with the keep-replit-alive.js script!"
echo "========================================================"