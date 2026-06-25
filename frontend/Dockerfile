# --- ETAPA 1: Compilación ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
# Invalidar cache para siempre copiar código fresco
ARG CACHEBUST=1
COPY . .
RUN npm run build

# --- ETAPA 2: Servidor de producción ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]