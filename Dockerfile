FROM node:18-alpine

WORKDIR /app

# Copy everything first
COPY . .

# Install dependencies
RUN npm install --only=production

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "api/ai-coach.js"]