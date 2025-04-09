# NotesHub - Development and Deployment Guide

This guide explains how to run and deploy the NotesHub application with different backend configurations.

## Important Note About Firebase Hosting + Local Backend

There's a critical limitation to be aware of: **Firebase hosting cannot proxy requests to your localhost when accessed from a different device**. This is because the redirection happens on Firebase's servers, which can't access your local machine.

## Local Development

For the best local development experience:

1. **Start the local backend**:
   ```
   npm run dev
   ```
   This starts the Express server on port 5000.

2. **Access directly via localhost**:
   Open [http://localhost:5000](http://localhost:5000) in your browser.
   
   This is the simplest way to test during development - your frontend and backend are served from the same origin.

## Configuration Changes Made

We've made several key changes to improve your application:

1. **CORS (Cross-Origin Resource Sharing)**:
   - The backend now accepts requests from any origin (including `file://` protocol)
   - Manual CORS headers implementation for maximum compatibility
   - Properly handles preflight OPTIONS requests

2. **Content Security Policy (CSP)**:
   - Updated to allow connections from all origins (`connect-src *`) in production mode
   - This ensures your frontend can communicate with various backends

3. **Rate Limiting**:
   - Fixed the `trust proxy` setting to properly handle rate limiting with forwarded headers

4. **Certificate Pinning**:
   - Modified the certificate pinning logic to always return `true` during development
   - Fixed Vite-specific environment variable access using `import.meta.env` instead of `process.env`

## Deployment Options

### Option 1: Deploy Frontend to Firebase and Backend to Replit (Recommended)

This project is configured for a split deployment:
- **Frontend**: Deployed to Firebase Hosting
- **Backend**: Deployed to Replit
- **Database**: Using Supabase (PostgreSQL)

#### Prerequisites:
- Firebase account and project
- Replit account (this project)
- Supabase account with a project and database

#### Step 1: Prepare the Backend on Replit
1. Configure Replit secrets with the following:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase service role key

2. Run the backend preparation script:
   ```bash
   ./prepare-backend.sh
   ```

3. Start the backend in production mode:
   ```bash
   npm start
   ```

4. Note your Replit app URL (e.g., `https://your-project.your-username.repl.co`)

#### Step 2: Configure Firebase and Deploy Frontend
1. Update your `.env.production` file with the backend URL:
   ```
   VITE_API_BASE_URL=https://your-replit-backend.repl.co
   ```

2. Update CORS configuration in `server/index.ts`:
   ```typescript
   const allowedOrigins = [
     // ... existing origins
     'https://your-firebase-app.web.app',
     'https://your-firebase-app.firebaseapp.com',
   ];
   ```

3. Initialize Firebase (if not already done):
   ```bash
   firebase login
   firebase init hosting
   ```
   
4. Deploy to Firebase:
   ```bash
   ./deploy-to-firebase.sh
   ```

### Option 2: Deploy Both Frontend and Backend to Firebase

1. **Move API logic to Firebase Functions**:
   - Initialize Firebase Functions in your project
   - Port your Express routes to Firebase Functions
   - This allows both frontend and backend to be deployed together

2. **Configure Firebase hosting to use Functions**:
   ```json
   "rewrites": [
     {
       "source": "/api/**",
       "function": "api"
     },
     {
       "source": "**",
       "destination": "/index.html"
     }
   ]
   ```

### Option 3: Use a Tunneling Service for Temporary Development

For temporary demos or development, use a tunneling service:

1. **Install ngrok**: `npm install -g ngrok`
2. **Run your local server**: `npm run dev`
3. **In a separate terminal**: `ngrok http 5000`
4. **Use the provided public URL** in your Firebase configuration
5. **Redeploy to Firebase**

## Testing CORS Configuration

You can test that CORS is properly configured by using curl:

```
curl -v -H "Origin: https://notezhub.web.app" http://localhost:5000/test
curl -v -H "Origin: file:///home/user" http://localhost:5000/test
```

You should see responses with the appropriate `Access-Control-Allow-Origin` headers matching your request origin.

## Troubleshooting

If you encounter CORS errors:
1. Make sure your backend is running and accessible
2. For local development, directly access http://localhost:5000
3. For production, deploy your backend to a public URL
4. If using a tunneling service, ensure it's still running and the URL is current# notezhubz
# notezhubz
# notezhubz
# notezhubz
