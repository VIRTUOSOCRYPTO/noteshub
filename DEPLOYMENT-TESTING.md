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

If you see CORS errors in the browser console like:

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at 'https://noteshub-api-gqkp.onrender.com/api/db-status'. (Reason: Credential is not supported if the CORS header 'Access-Control-Allow-Origin' is '*').
```

**Solution**: 

The error occurs because when using credentials, the CORS `Access-Control-Allow-Origin` header cannot be `*` (wildcard) - it must be the specific origin.

1. Check your CORS configuration in `server/index.ts` and ensure:

   a. Your domain is included in the `allowedOrigins` array:
   ```javascript
   allowedOrigins = [
     'https://notezhubz.web.app',
     'https://notezhubz.firebaseapp.com',
     'https://noteshub-ocpi.onrender.com',
     // Add any other domains here
   ];
   ```

   b. The CORS middleware is correctly setting the specific origin:
   ```javascript
   // If origin exists, always use the specific origin, NEVER a wildcard
   if (origin) {
     res.setHeader('Access-Control-Allow-Origin', origin);
     res.setHeader('Access-Control-Allow-Credentials', 'true');
   }
   ```

2. Deploy the updated code to Render.

3. To verify the CORS headers are being set correctly, run:
```javascript
// Run in browser console
fetch('https://noteshub-api-gqkp.onrender.com/api/test', { 
  method: 'OPTIONS',
  credentials: 'include',
  mode: 'cors'
}).then(response => {
  console.log('Response status:', response.status);
  console.log('Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
  console.log('Access-Control-Allow-Credentials:', response.headers.get('Access-Control-Allow-Credentials'));
});
```

This should return status 204 (No Content) for the OPTIONS preflight request, and the headers should match your origin.

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

The database status indicator on the frontend uses the `/api/db-status` endpoint. If this doesn't work, the frontend will automatically try these alternative endpoints in sequence:

1. `/api/db-check`
2. `/api/dbstatus`
3. `/api/status`
4. `/api/ping`
5. `/api/test`

This provides multiple fallback options to ensure the frontend can always check if the API is available.

To manually test these endpoints, you can use the following script in your browser console:

```javascript
// Run in browser console
const endpoints = [
  '/api/db-status',
  '/api/db-check',
  '/api/dbstatus',
  '/api/status',
  '/api/ping',
  '/api/test'
];

async function testAllEndpoints() {
  console.log('Testing all API endpoints...');
  
  for (const endpoint of endpoints) {
    const fullUrl = `https://noteshub-api-gqkp.onrender.com${endpoint}`;
    console.log(`Testing: ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS - ${endpoint}:`, data);
      } else {
        console.log(`❌ FAILED - ${endpoint}: Status ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ ERROR - ${endpoint}:`, error.message);
    }
  }
  
  console.log('Endpoint testing complete');
}

// Run the test
testAllEndpoints();
```

## Conclusion

If all tests pass, your deployment is working correctly! If you encounter issues, refer to the troubleshooting section or the main `DEPLOYMENT.md` file for more detailed guidance.
