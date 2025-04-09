const ngrok = require('ngrok');
const fs = require('fs');
const { execSync } = require('child_process');

// Port your backend is running on
const PORT = 5000;

/**
 * Starts an ngrok tunnel to make the local backend accessible from the internet
 */
async function startTunnel() {
  try {
    // Connect to ngrok and get a public URL for our local server
    const url = await ngrok.connect({
      addr: PORT,
      region: 'us', // Change to your preferred region if needed
    });

    console.log('\x1b[32m%s\x1b[0m', '✓ Ngrok tunnel started successfully!');
    console.log('\x1b[36m%s\x1b[0m', `Public URL: ${url}`);
    
    // Update .env.production with the new URL
    updateEnvProduction(url);
    
    // Update firebase.json with the new URL
    updateFirebaseConfig(url);
    
    console.log('\x1b[32m%s\x1b[0m', '✓ Configuration files updated successfully!');
    console.log('\x1b[33m%s\x1b[0m', 'Next steps:');
    console.log('1. Build your frontend: npm run build');
    console.log('2. Deploy to Firebase: firebase deploy');
    console.log('\x1b[31m%s\x1b[0m', 'Keep this process running while you use the application!');
    console.log('\x1b[31m%s\x1b[0m', 'The ngrok URL will change each time you run this script.');
    
    // Keep the process running
    process.stdin.resume();
    
    // Handle cleanup when the process is terminated
    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error starting ngrok tunnel:', error);
    process.exit(1);
  }
}

/**
 * Updates the .env.production file with the new ngrok URL
 */
function updateEnvProduction(url) {
  try {
    const envPath = './.env.production';
    let envContent = '';
    
    // Read existing content if the file exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Replace or add the VITE_API_BASE_URL
    if (envContent.includes('VITE_API_BASE_URL=')) {
      envContent = envContent.replace(
        /VITE_API_BASE_URL=.*/g, 
        `VITE_API_BASE_URL=${url}`
      );
    } else {
      envContent += `\nVITE_API_BASE_URL=${url}\n`;
    }
    
    // Write back to the file
    fs.writeFileSync(envPath, envContent);
    console.log('\x1b[32m%s\x1b[0m', `✓ Updated .env.production with API URL: ${url}`);
  } catch (error) {
    console.error('Error updating .env.production:', error);
  }
}

/**
 * Updates the firebase.json file with the new ngrok URL
 */
function updateFirebaseConfig(url) {
  try {
    const configPath = './firebase.json';
    
    // Read existing firebase.json
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Update the rewrites configuration
    if (firebaseConfig.hosting && firebaseConfig.hosting.rewrites) {
      const apiRewrite = firebaseConfig.hosting.rewrites.find(
        rewrite => rewrite.source === '/api/**'
      );
      
      if (apiRewrite) {
        apiRewrite.destination = `${url}/api/**`;
      } else {
        firebaseConfig.hosting.rewrites.unshift({
          source: '/api/**',
          destination: `${url}/api/**`
        });
      }
    }
    
    // Write the updated config back to firebase.json
    fs.writeFileSync(configPath, JSON.stringify(firebaseConfig, null, 2));
    console.log('\x1b[32m%s\x1b[0m', `✓ Updated firebase.json with API URL: ${url}`);
  } catch (error) {
    console.error('Error updating firebase.json:', error);
  }
}

/**
 * Cleanup function to disconnect ngrok when the script is terminated
 */
async function cleanup() {
  console.log('\nShutting down ngrok tunnel...');
  await ngrok.kill();
  console.log('Ngrok tunnel closed.');
}

// Start the tunnel
startTunnel();