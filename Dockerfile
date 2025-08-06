# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code (only what we need for the API)
COPY api/ ./api/

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "api/ai-coach.js"]