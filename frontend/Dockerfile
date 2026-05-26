# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

EXPOSE 5173

# Run the development server
CMD ["npm", "run", "dev"]