#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  NotesHub Tunnel Setup Script${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check if the backend server is running
if ! curl -s http://localhost:5000/api > /dev/null; then
  echo -e "${RED}Error: Backend server is not running on port 5000${NC}"
  echo -e "Please start your backend server first with: ${YELLOW}npm run dev${NC}"
  exit 1
fi

echo -e "\n${GREEN}✅ Backend server detected on port 5000${NC}"
echo -e "Starting localtunnel..."

# Run the localtunnel script
node localtunnel.js