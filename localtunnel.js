/**
 * Creates a localtunnel to make the local backend accessible from the internet
 */
import localtunnel from 'localtunnel';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5000;

/**
 * Starts a localtunnel to make the local backend accessible from the internet
 */
async function startTunnel() {
  try {
    console.log(`Starting localtunnel to port ${PORT}...`);
    
    // Connect to localtunnel
    const tunnel = await localtunnel({ port: PORT });
    
    console.log(`✅ Tunnel established! Public URL: ${tunnel.url}`);
    
    // Update environment files and Firebase config
    updateEnvProduction(tunnel.url);
    updateFirebaseConfig(tunnel.url);
    
    console.log('\n🔥 Next steps:');
    console.log('1. Build your frontend: npm run build');
    console.log('2. Deploy to Firebase: firebase deploy');
    console.log('3. Your deployed app will now connect to your local backend via localtunnel\n');
    
    console.log('⚠️ IMPORTANT: Keep this terminal window open!');
    console.log('When you close this window, the tunnel will be closed and your app will stop working.');
    
    // Handle cleanup on exit
    process.on('SIGINT', () => cleanup(tunnel));
    process.on('SIGTERM', () => cleanup(tunnel));
    
    // Handle tunnel errors
    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
    
    // Handle tunnel close
    tunnel.on('close', () => {
      console.log('Tunnel closed');
      process.exit();
    });
  } catch (error) {
    console.error('❌ Error starting tunnel:', error);
    process.exit(1);
  }
}

/**
 * Updates the .env.production file with the new URL
 */
function updateEnvProduction(url) {
  try {
    const envPath = path.join(__dirname, '.env.production');
    let content = '';
    
    // Read existing file if it exists
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
      // Replace or add VITE_API_BASE_URL
      if (content.includes('VITE_API_BASE_URL=')) {
        content = content.replace(/VITE_API_BASE_URL=.*/g, `VITE_API_BASE_URL=${url}`);
      } else {
        content += `\nVITE_API_BASE_URL=${url}\n`;
      }
    } else {
      content = `VITE_API_BASE_URL=${url}\n`;
    }
    
    fs.writeFileSync(envPath, content);
    console.log(`✅ Updated .env.production with new API URL`);
  } catch (error) {
    console.error('❌ Error updating .env.production:', error);
  }
}

/**
 * Updates the firebase.json file with the new URL
 */
function updateFirebaseConfig(url) {
  try {
    const firebasePath = path.join(__dirname, 'firebase.json');
    
    if (!fs.existsSync(firebasePath)) {
      console.warn('⚠️ firebase.json not found. Please update it manually.');
      return;
    }
    
    const firebaseConfig = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
    
    // Update rewrites
    if (firebaseConfig.hosting && firebaseConfig.hosting.rewrites) {
      const apiRewrite = firebaseConfig.hosting.rewrites.find(
        rule => rule.source === '/api/**'
      );
      
      if (apiRewrite) {
        apiRewrite.destination = `${url}/api/**`;
      } else {
        firebaseConfig.hosting.rewrites.unshift({
          source: '/api/**',
          destination: `${url}/api/**`
        });
      }
      
      fs.writeFileSync(firebasePath, JSON.stringify(firebaseConfig, null, 2));
      console.log(`✅ Updated firebase.json with new API URL`);
    } else {
      console.warn('⚠️ Could not find rewrites in firebase.json. Please update it manually.');
    }
  } catch (error) {
    console.error('❌ Error updating firebase.json:', error);
  }
}

/**
 * Cleanup function to close the tunnel when the script is terminated
 */
function cleanup(tunnel) {
  console.log('\nShutting down tunnel...');
  tunnel.close();
}

// Start the tunnel
startTunnel();