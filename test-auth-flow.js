/**
 * NotesHub Authentication Flow Test Script
 * 
 * This script tests the authentication flow between frontend and backend on Render.
 * It can be run in any JavaScript environment with fetch support.
 */

// Configuration
const config = {
  backendUrl: 'https://noteshub-api-gqkp.onrender.com',
  // Test user credentials (use a test account only, never real credentials)
  testUser: {
    usn: 'testuser123',
    password: 'TestPassword123!'
  }
};

// Storage for tokens
let authToken = null;
let refreshToken = null;

// Helper function to make API requests
async function makeRequest(endpoint, options = {}) {
  const url = `${config.backendUrl}${endpoint}`;
  
  // Add auth header if we have a token and it's not a login request
  if (authToken && !endpoint.includes('/login')) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${authToken}`
    };
  }
  
  try {
    console.log(`Making request to: ${url}`);
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response body:`, errorData);
      return { success: false, status: response.status, error: errorData.error || errorData.message };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 1: User Registration
async function testUserRegistration() {
  console.log('===== TESTING USER REGISTRATION =====');
  
  // Generate a unique username using timestamp to avoid conflicts
  const uniqueUser = {
    usn: `test_${Date.now()}`,
    password: 'TestPassword123!',
    email: `test_${Date.now()}@example.com`,
    department: 'Computer Science',
    college: 'Test College',
    year: 2
  };
  
  const result = await makeRequest('/api/register', {
    method: 'POST',
    body: JSON.stringify(uniqueUser)
  });
  
  if (result.success && result.data.user) {
    console.log('User registration successful!');
    console.log(`Created user: ${result.data.user.usn}`);
    
    // Store the created user info for login test
    config.testUser = {
      usn: uniqueUser.usn,
      password: uniqueUser.password
    };
    
    return true;
  } else {
    console.error('User registration failed!');
    return false;
  }
}

// Test 2: User Login
async function testUserLogin() {
  console.log('===== TESTING USER LOGIN =====');
  const result = await makeRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({
      usn: config.testUser.usn,
      password: config.testUser.password
    })
  });
  
  if (result.success && result.data.user) {
    console.log('User login successful!');
    console.log(`Logged in as: ${result.data.user.usn}`);
    
    // Store tokens
    authToken = result.data.accessToken;
    refreshToken = result.data.refreshToken;
    
    return true;
  } else {
    console.error('User login failed!');
    return false;
  }
}

// Test 3: Get Current User
async function testGetCurrentUser() {
  console.log('===== TESTING GET CURRENT USER =====');
  
  const result = await makeRequest('/api/user');
  
  if (result.success && result.data.usn) {
    console.log('Get current user successful!');
    console.log(`Current user: ${result.data.usn}`);
    return true;
  } else {
    console.error('Get current user failed!');
    return false;
  }
}

// Test 4: Logout
async function testUserLogout() {
  console.log('===== TESTING USER LOGOUT =====');
  
  const result = await makeRequest('/api/logout', {
    method: 'POST'
  });
  
  if (result.success) {
    console.log('User logout successful!');
    // Clear tokens
    authToken = null;
    refreshToken = null;
    return true;
  } else {
    console.error('User logout failed!');
    return false;
  }
}

// Run all authentication tests in sequence
async function runAuthenticationTests() {
  console.log('Starting NotesHub authentication flow tests...');
  console.log(`Backend URL: ${config.backendUrl}`);
  
  // Skip registration if you already have a test user
  const skipRegistration = false;
  
  const results = {
    registration: skipRegistration ? 'SKIPPED' : await testUserRegistration(),
    login: await testUserLogin(),
    getCurrentUser: await testGetCurrentUser(),
    logout: await testUserLogout()
  };
  
  console.log('\n===== AUTHENTICATION TEST RESULTS =====');
  Object.entries(results).forEach(([test, passed]) => {
    if (passed === 'SKIPPED') {
      console.log(`${test}: ⏭️ SKIPPED`);
    } else {
      console.log(`${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    }
  });
  
  const allPassed = Object.values(results).every(result => result === true || result === 'SKIPPED');
  
  console.log(`\nOverall result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('See above for details of any failed tests.');
  
  return results;
}

// Run the tests
runAuthenticationTests();
