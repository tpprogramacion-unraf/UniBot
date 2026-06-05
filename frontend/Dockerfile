# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# API URL config for production
ENV VITE_API_URL=https://api.app10.academia.ar/api
ENV VITE_BACKEND_URL=https://api.app10.academia.ar

EXPOSE 5173

# Run the development server (deploy system may override this)
CMD ["npm", "run", "dev"]