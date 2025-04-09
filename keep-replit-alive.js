/**
 * Keep Replit alive by pinging the server every 5 minutes
 * Run this script with: node keep-replit-alive.js
 * 
 * This prevents Replit's free tier from putting your project to sleep
 * due to inactivity. For a more robust solution in production,
 * consider using external services like UptimeRobot.
 */

const https = require('https');
const http = require('http');

// Set your Replit URL here
const REPLIT_URL = 'https://your-project-name.your-username.repl.co';

// Ping interval in milliseconds (5 minutes)
const PING_INTERVAL = 5 * 60 * 1000;

/**
 * Send a ping to the Replit server
 */
function pingServer() {
  console.log(`[${new Date().toISOString()}] Pinging ${REPLIT_URL}...`);
  
  const client = REPLIT_URL.startsWith('https') ? https : http;
  
  // Simple GET request to ping the server
  const req = client.get(`${REPLIT_URL}/test`, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`[${new Date().toISOString()}] Response: ${res.statusCode} ${res.statusMessage}`);
      try {
        const response = JSON.parse(data);
        console.log(`[${new Date().toISOString()}] Data: ${JSON.stringify(response)}`);
      } catch (e) {
        console.log(`[${new Date().toISOString()}] Data: ${data}`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Error: ${error.message}`);
  });
  
  req.end();
}

// Initial ping
pingServer();

// Set up interval to ping the server regularly
setInterval(pingServer, PING_INTERVAL);

console.log(`[${new Date().toISOString()}] Keep-alive service started.`);
console.log(`Pinging ${REPLIT_URL} every ${PING_INTERVAL / 1000 / 60} minutes.`);
console.log('Press Ctrl+C to stop.');