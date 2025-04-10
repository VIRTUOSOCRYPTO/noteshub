# Use Node LTS
FROM node:18

# Create app dir
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy rest of the files
COPY . .

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
