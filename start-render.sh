#!/bin/bash
# List available directories to debug
echo "Current directory structure:"
ls -la

# Check if the expected path exists
if [ -f "dist/server/index.js" ]; then
  echo "Found server file at dist/server/index.js"
  NODE_ENV=production node dist/server/index.js
elif [ -f "dist/index.js" ]; then
  echo "Found server file at dist/index.js"
  NODE_ENV=production node dist/index.js
else
  echo "WARNING: TypeScript server file not found. Using fallback server instead."
  echo "Directory contents:"
  find dist -type f -name "*.js" | sort
  
  echo "Starting fallback server..."
  NODE_ENV=production node render-app.js
fi