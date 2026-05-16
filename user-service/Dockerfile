FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Create data directory
RUN mkdir -p data

# Expose ports
# 3000 for REST API
# 50051 for gRPC
EXPOSE 3000 50051

# Start both servers
CMD ["node", "server.js"]
