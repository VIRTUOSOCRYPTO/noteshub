/**
 * NotesHub Render Deployment Test Script
 * 
 * This script tests the full user flow between the frontend and backend
 * deployments on Render. It uses plain JavaScript and can be run in a browser console.
 */

// Configuration - update these values with your actual deployment URLs
const config = {
  frontendUrl: 'https://noteshub-ocpi.onrender.com',
  backendUrl: ' https://noteshubz.onrender.com',
  firebaseUrl: 'https://notezhubz.web.app'
};

// Helper function to make API requests
async function makeRequest(url, options = {}) {
  try {
    console.log(`Making request to: ${url}`);
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      mode: 'cors'
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response body:`, errorText);
      return { success: false, status: response.status, error: errorText };
    }
    
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const text = await response.text();
      return { success: true, text };
    }
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test the backend health endpoint
async function testBackendHealth() {
  console.log('===== TESTING BACKEND HEALTH =====');
  const result = await makeRequest(`${config.backendUrl}/api/test`);
  
  if (result.success && result.data && result.data.message) {
    console.log('Backend health check successful!');
    console.log(`Message: ${result.data.message}`);
    return true;
  } else {
    console.error('Backend health check failed!');
    return false;
  }
}

// Test database status
async function testDatabaseStatus() {
  console.log('===== TESTING DATABASE STATUS =====');
  
  try {
    // Try the db-status endpoint first
    const result = await makeRequest(`${config.backendUrl}/api/db-status`);
    
    if (result.success) {
      console.log('Database status check successful!');
      console.log(`Status: ${result.data.status}`);
      console.log(`Message: ${result.data.message}`);
      console.log(`Using fallback: ${result.data.fallback}`);
      return true;
    }
  } catch (error) {
    console.log('Primary db-status endpoint failed, trying alternative...');
  }
  
  try {
    // Try alternative db-check endpoint
    const result = await makeRequest(`${config.backendUrl}/api/db-check`);
    
    if (result.success) {
      console.log('Alternative database check successful!');
      console.log(`Status: ${result.data.status}`);
      return true;
    }
  } catch (error) {
    console.error('All database endpoints failed!');
    return false;
  }
}

// Test notes endpoint
async function testNotesEndpoint() {
  console.log('===== TESTING NOTES ENDPOINT =====');
  const result = await makeRequest(`${config.backendUrl}/api/notes`);
  
  if (result.success && Array.isArray(result.data)) {
    console.log('Notes endpoint check successful!');
    console.log(`Retrieved ${result.data.length} notes`);
    return true;
  } else {
    console.error('Notes endpoint check failed!');
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting NotesHub deployment tests...');
  console.log(`Frontend URL: ${config.frontendUrl}`);
  console.log(`Backend URL: ${config.backendUrl}`);
  console.log(`Firebase URL: ${config.firebaseUrl}`);
  
  const results = {
    backendHealth: await testBackendHealth(),
    databaseStatus: await testDatabaseStatus(),
    notesEndpoint: await testNotesEndpoint()
  };
  
  console.log('\n===== TEST RESULTS SUMMARY =====');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result === true);
  
  console.log(`\nOverall result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('See above for details of any failed tests.');
  
  return results;
}

// Automatically run tests when the script is loaded
runTests();
