# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build arg for API URL (set by deploy system)
ARG VITE_API_URL=https://api.app10.academia.ar/api
ENV VITE_API_URL=$VITE_API_URL

# Build for production
RUN npm run build

EXPOSE 5173

# Run the development server (deploy system may override this)
CMD ["npm", "run", "dev"]