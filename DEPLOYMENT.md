# NotesHub Deployment Guide

This guide outlines how to deploy the NotesHub application, which consists of a React/TypeScript frontend and an Express backend with PostgreSQL database.

## Prerequisites

- A Replit account for hosting the backend
- A Firebase account for hosting the frontend
- The Firebase CLI installed
- A Supabase account with a PostgreSQL database and API keys

## Step 1: Prepare the Backend on Replit

1. Configure Replit secrets: DATABASE_URL, SUPABASE_URL, SUPABASE_KEY
2. Run: ./prepare-backend.sh
3. Start the backend: npm start
4. Note your Replit app URL

## Step 2: Configure the Frontend for Production

1. Update .env.production with backend URL
2. Update CORS in server/index.ts to include Firebase domain

## Step 3: Deploy the Frontend to Firebase

1. Login: firebase login
2. Initialize Firebase: firebase init hosting
3. Deploy: ./deploy-to-firebase.sh

See the full deployment scripts for detailed instructions.