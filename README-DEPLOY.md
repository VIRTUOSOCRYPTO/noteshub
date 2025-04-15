# NotezHub Deployment Guide

This guide covers how to deploy the NotezHub application to production and how to test API endpoints.

## Deployment Architecture

The NotezHub application consists of two main components:

1. **Frontend** - React application deployed on [notezhubz.web.app](https://noteshub-ocpi.onrender.com)
2. **Backend** - Express.js API deployed on [noteshub-api-gqkp.onrender.com](https://noteshub-api-gqkp.onrender.com)

## Testing API Endpoints

The backend provides several endpoints for testing connectivity and authentication:

### Core API Endpoints

- `/api/test` - Test API connection (no auth required)
- `/api/db-test` - Test database connection (no auth required)
- `/api/notes` - Get all notes (no auth required for testing)
- `/api/user` - Get current user (requires authentication)

### Authentication Endpoints

- `/api/user-test` - Get mock user data for testing (no auth required)
- `/api/login` - Login endpoint
  - GET: Returns form fields and demo credentials
  - POST: Authenticates a user
- `/api/register` - Registration endpoint
  - GET: Returns form fields
  - POST: Registers a new user

### Development Testing

For development and testing purposes, the API provides:

- Set `NODE_ENV=development` for additional testing features
- Use `/api/user?mockuser=true` in development mode to get mock user data
- Use the demo credentials:
  - Username: `DEMO12345`
  - Password: `Password123!`

### CORS Debugging

If you encounter CORS issues:

1. Check the `/api/cors-debug` endpoint to see the headers being sent
2. Ensure your frontend is using the correct API URL:
   - Production: `https://noteshub-api-gqkp.onrender.com`
   - Development: Empty string (same-origin)
3. Verify your request includes these headers:
   - `Content-Type: application/json`
   - `Origin: [your frontend URL]`

## Common Issues

### CORS Errors

If you see "No 'Access-Control-Allow-Origin' header is present" errors:

1. Check that the backend CORS configuration includes your frontend domain
2. Ensure you're using `credentials: 'include'` in fetch requests
3. Set proper `Origin` headers
4. Test with the `/api/cors-debug` endpoint

### Authentication Issues

If you receive 401 Unauthorized errors:

1. Make sure you're sending the token in the Authorization header
2. For testing, use the `/api/user-test` endpoint which doesn't require authentication
3. Check that localStorage is storing the token correctly

### Backend Connection Issues

If you can't connect to the backend:

1. Verify the API is running with `/api/test`
2. Check frontend configuration in `client/src/lib/api.ts` has the correct URL
3. Confirm `.env.production` has `VITE_API_BASE_URL` set correctly

## Deployment Checklist

Before deploying a new version:

1. Test all API endpoints locally
2. Verify CORS works between local frontend and production backend
3. Update API URLs in configuration if they've changed
4. Check authentication flows with demo credentials
