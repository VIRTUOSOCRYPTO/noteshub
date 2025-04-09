#!/bin/bash

# Script to deploy the frontend to Firebase Hosting
# Make sure to have the Firebase CLI installed
# npm install -g firebase-tools

echo "Building the frontend for production..."
NODE_ENV=production npm run build

echo "Deploying frontend to Firebase Hosting..."
firebase deploy --only hosting

echo "Frontend deployment complete!"
echo "Your frontend is now available at https://notezhubz.web.app"
echo ""
echo "Make sure your frontend is configured to connect to your Replit backend."
echo "Update client/src/lib/api.ts with your actual Replit URL before deploying."