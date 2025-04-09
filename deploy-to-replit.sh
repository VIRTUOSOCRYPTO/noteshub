#!/bin/bash
# Script to deploy NotesHub backend to Replit
# Usage: ./deploy-to-replit.sh

set -e

echo "======================================================================================"
echo "NotesHub - Backend Deployment to Replit"
echo "======================================================================================"
echo 
echo "This script will help you deploy your backend to Replit."
echo "Make sure you have already:"
echo "1. Created a Replit account"
echo "2. Created a new Repl using the Node.js template"
echo "3. Have your PostgreSQL database credentials ready"
echo

# Check if the user has the replit CLI tool installed
if ! command -v replit &> /dev/null; then
    echo "Replit CLI not found. Please install it first using:"
    echo "npm install -g replit-cli"
    exit 1
fi

# Ask for Replit information
read -p "Enter your Replit username: " REPLIT_USERNAME
read -p "Enter your Replit app name: " REPLIT_APP_NAME

# Ask for database information
read -p "Enter your PostgreSQL database URL: " DB_URL

echo
echo "Setting up environment variables..."

# Create a temporary .env file for Replit
cat > .env.replit << EOF
NODE_ENV=production
DATABASE_URL=${DB_URL}
PORT=443
FORCE_SECURE_COOKIES=true
FORCE_HSTS=true
EOF

echo "Environment file created."
echo

# Optional: Ask for Firebase configuration to enable authentication
read -p "Do you want to set up Firebase authentication? (y/n): " SETUP_FIREBASE
if [[ "$SETUP_FIREBASE" == "y" ]]; then
    read -p "Enter your Firebase API Key: " FIREBASE_API_KEY
    read -p "Enter your Firebase Project ID: " FIREBASE_PROJECT_ID
    read -p "Enter your Firebase App ID: " FIREBASE_APP_ID
    
    # Add Firebase configuration to the temporary .env file
    cat >> .env.replit << EOF
VITE_FIREBASE_API_KEY=${FIREBASE_API_KEY}
VITE_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
VITE_FIREBASE_APP_ID=${FIREBASE_APP_ID}
EOF

    echo "Firebase configuration added."
    echo
fi

# Update the keep-replit-alive.js file with the correct URL
REPLIT_URL="https://${REPLIT_APP_NAME}.${REPLIT_USERNAME}.repl.co"
echo "Configuring keep-alive script with URL: ${REPLIT_URL}"

cat > keep-replit-alive.js << EOF
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
const REPLIT_URL = '${REPLIT_URL}';

// Ping interval in milliseconds (5 minutes)
const PING_INTERVAL = 5 * 60 * 1000;

/**
 * Send a ping to the Replit server
 */
function pingServer() {
  console.log(\`[\${new Date().toISOString()}] Pinging \${REPLIT_URL}...\`);
  
  const client = REPLIT_URL.startsWith('https') ? https : http;
  
  // Simple GET request to ping the server
  const req = client.get(\`\${REPLIT_URL}/test\`, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(\`[\${new Date().toISOString()}] Response: \${res.statusCode} \${res.statusMessage}\`);
      try {
        const response = JSON.parse(data);
        console.log(\`[\${new Date().toISOString()}] Data: \${JSON.stringify(response)}\`);
      } catch (e) {
        console.log(\`[\${new Date().toISOString()}] Data: \${data}\`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error(\`[\${new Date().toISOString()}] Error: \${error.message}\`);
  });
  
  req.end();
}

// Initial ping
pingServer();

// Set up interval to ping the server regularly
setInterval(pingServer, PING_INTERVAL);

console.log(\`[\${new Date().toISOString()}] Keep-alive service started.\`);
console.log(\`Pinging \${REPLIT_URL} every \${PING_INTERVAL / 1000 / 60} minutes.\`);
console.log('Press Ctrl+C to stop.');
EOF

echo "Keep-alive script configured."
echo

# Display deployment instructions
echo "======================================================================================"
echo "DEPLOYMENT INSTRUCTIONS"
echo "======================================================================================"
echo 
echo "1. Upload your project to Replit:"
echo "   - Open your Repl at https://replit.com/@${REPLIT_USERNAME}/${REPLIT_APP_NAME}"
echo "   - Import from GitHub or upload project files"
echo
echo "2. Set up environment variables in Replit:"
echo "   - Go to 'Secrets' (lock icon) in the left panel"
echo "   - Add the contents of .env.replit as secrets"
echo
echo "3. Configure workflow in Replit:"
echo "   - Go to 'Tools' → 'Workflows' in the left panel"
echo "   - Create a workflow named 'Start application'"
echo "   - Set the command to 'npm run dev'"
echo
echo "4. Run the application:"
echo "   - Click the 'Run' button at the top of the Replit interface"
echo
echo "5. Test your backend:"
echo "   - Visit ${REPLIT_URL}/test in your browser"
echo
echo "6. Update your frontend configuration (.env.production):"
echo "   VITE_API_BASE_URL=${REPLIT_URL}/api"
echo
echo "7. Deploy your frontend to Firebase using:"
echo "   ./deploy-frontend.sh"
echo
echo "======================================================================================"

# Cleanup temporary files
rm .env.replit

echo "Setup complete!"
echo "Follow the instructions above to complete your deployment."