# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy entrypoint (instala deps frescos en cada inicio)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# API URL config for production
ENV VITE_API_URL=https://api.app10.academia.ar/api
ENV VITE_BACKEND_URL=https://api.app10.academia.ar

EXPOSE 5173

# Entrypoint: npm install + npm run dev
ENTRYPOINT ["/entrypoint.sh"]