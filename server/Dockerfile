# Use Node LTS
FROM node:18

# Create app dir
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Build the application
RUN npm run build 

# Copy rest of the files
COPY . .

# Expose port (match this with your server's port in index.ts)
EXPOSE 5000

# Start the server in production mode
CMD ["node", "dist/index.js"]
