#!/bin/bash

# Exit on error
set -e

# Ensure firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo "📦 Installing Firebase CLI..."
  npm install -g firebase-tools
fi

echo "🔧 Preparing build for Firebase deployment..."

# Check for .firebaserc - if not found, need to initialize project
if [ ! -f .firebaserc ]; then
  echo "⚠️ Firebase project not initialized yet."
  echo "Please run 'firebase login' and 'firebase init' first."
  echo "You can also run: firebase init hosting"
  exit 1
fi

# Build the project for production
echo "🏗️ Building frontend for production..."
npm run build

# Create the firebase-deploy directory if it doesn't exist
mkdir -p firebase-deploy

# Copy build files to firebase-deploy directory
echo "📋 Copying build files to firebase-deploy directory..."
cp -r build/* firebase-deploy/

# Update the .env.production file to point to backend URL
echo "🔄 Updating environment configuration..."
read -p "Enter your backend URL (e.g., https://your-backend.replit.app): " BACKEND_URL

# Create or update the .env.production file
echo "VITE_API_BASE_URL=$BACKEND_URL" > .env.production

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo ""
echo "⚠️ Important: Make sure your Firebase domain is added to the CORS allowed origins in your backend."
echo "   Add it to the allowedOrigins array in server/index.ts and redeploy your backend."