# NotesHub Deployment Testing Guide

This document provides instructions for testing your NotesHub deployment on Render.

## Prerequisites

- Your NotesHub frontend and backend deployed on Render
- A modern web browser with developer console access

## Testing Methods

You can test your deployment in two ways:

1. **Manual Testing**: Access your frontend and test features through the UI
2. **Automated Testing**: Use the provided test scripts in the browser console

## Manual Testing Checklist

Open your frontend app (e.g., `https://noteshub-ocpi.onrender.com`) and verify:

- [ ] The application loads without errors
- [ ] User registration works
- [ ] User login works
- [ ] Notes listing works
- [ ] Note creation works (if you have permissions)
- [ ] User profile information is displayed correctly
- [ ] Logout functionality works

## Automated Testing with Browser Console

The repository includes test scripts you can run in your browser console:

### Basic API Tests

1. Open your browser's developer tools (F12 or right-click → Inspect)
2. Go to the Console tab
3. Open `test-render-deployment.js` from this repository
4. Copy and paste the entire script into the console
5. Update the URLs in the config section to match your deployment
6. Press Enter to run the tests
7. Review the test results in the console

### Authentication Flow Tests

1. Open your browser's developer tools
2. Go to the Console tab
3. Open `test-auth-flow.js` from this repository
4. Copy and paste the entire script into the console
5. Update the backend URL and test credentials
6. Press Enter to run the tests
7. Review the authentication test results

## Troubleshooting Common Issues

### CORS Errors

If you see CORS errors in the browser console:

```
Access to fetch at 'https://noteshub-api-gqkp.onrender.com/api/notes' from origin 'https://noteshub-ocpi.onrender.com' has been blocked by CORS policy
```

**Solution**: Check your CORS configuration in `server/index.ts` and make sure it includes all frontend domains:

```javascript
allowedOrigins = [
  'https://notezhubz.web.app',
  'https://notezhubz.firebaseapp.com',
  'https://noteshub-ocpi.onrender.com',
  // Add any other domains here
];
```

### Authentication Issues

If login works but subsequent authenticated requests fail:

**Solution**: Check your cookie settings to ensure:
1. `sameSite: 'none'` is set for production
2. `secure: true` is set for production
3. No domain restrictions are set for cookies

### Network Errors

If you see "NetworkError when attempting to fetch resource":

**Solution**:
1. Ensure your backend is actually running (check Render dashboard)
2. Verify your API base URL in client-side code is correct
3. Remember that free Render instances "sleep" after inactivity
4. If using the `/api/db-status` endpoint, try `/api/test` or `/api/notes` instead

## Database Status Testing

The database status indicator on the frontend uses the `/api/db-status` endpoint. If this doesn't work, the frontend will try alternative endpoints.

To manually test database status:

```javascript
// Run in browser console
fetch('https://noteshub-api-gqkp.onrender.com/api/db-status', {
  credentials: 'include',
  mode: 'cors'
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Database status check failed:', error));
```

## Conclusion

If all tests pass, your deployment is working correctly! If you encounter issues, refer to the troubleshooting section or the main `DEPLOYMENT.md` file for more detailed guidance.
