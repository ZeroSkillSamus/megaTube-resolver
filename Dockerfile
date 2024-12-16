# Base image with Node.js
FROM node:20-alpine

# Install dependencies and Chromium
RUN apk add chromium

# Set environment variables for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser"

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY . .
COPY package*.json ./
RUN npm install
RUN npm run testP


# Copy application code

# Start the application
CMD ["npm", "run","simulate"]
