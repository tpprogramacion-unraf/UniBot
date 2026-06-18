#!/bin/bash
# ============================================================
#  UniBot — Setup completo para VPS fresco
#  Uso: curl -sSL https://raw.githubusercontent.com/tpprogramacion-unraf/UniBot/main/deploy/setup-vps.sh | bash -s -- TU_DOMINIO
#  O:   bash deploy/setup-vps.sh TU_DOMINIO
# ============================================================

set -euo pipefail

DOMAIN="${1:-}"
REPO_URL="https://github.com/tpprogramacion-unraf/UniBot.git"
APP_DIR="/opt/unibot"
WEBHOOK_SECRET=$(openssl rand -hex 20)

# ── Colores ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}═══ $1 ═══${NC}"; }

# ── Validar ──
if [ -z "$DOMAIN" ]; then
    err "Uso: bash setup-vps.sh TU_DOMINIO (ej: unibot.tudominio.com)"
fi

if [ "$EUID" -ne 0 ]; then
    err "Ejecutá como root: sudo bash setup-vps.sh $DOMAIN"
fi

# ============================================================
step "1/6 — Actualizando sistema"
# ============================================================
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq git curl wget ufw fail2ban jq
log "Sistema actualizado"

# ============================================================
step "2/6 — Instalando Docker"
# ============================================================
if command -v docker &> /dev/null; then
    log "Docker ya instalado: $(docker --version)"
else
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    log "Docker instalado: $(docker --version)"
fi

# Instalar docker compose plugin si no existe
if ! docker compose version &> /dev/null; then
    apt-get install -y -qq docker-compose-plugin
fi
log "Docker Compose: $(docker compose version --short)"

# ============================================================
step "3/6 — Configurando firewall"
# ============================================================
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "Firewall configurado (SSH + HTTP + HTTPS)"

# ============================================================
step "4/6 — Clonando repositorio"
# ============================================================
if [ -d "$APP_DIR" ]; then
    warn "Directorio $APP_DIR ya existe, haciendo pull..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi
log "Repositorio en $APP_DIR"

# Crear .env si no existe
if [ ! -f .env ]; then
    cat > .env <<EOF
SECRET_KEY=$(openssl rand -hex 32)
DEBUG=False
GROQ_API_KEY=TU_GROQ_API_KEY_AQUI
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
EOF
    warn "Creado .env — EDITÁ GROQ_API_KEY: nano $APP_DIR/.env"
fi

# ============================================================
step "5/6 — Configurando SSL con Certbot + Nginx"
# ============================================================
apt-get install -y -qq certbot

# Crear docker-compose.prod.yml con nginx SSL
cat > docker-compose.prod.yml <<'COMPOSE'
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    restart: unless-stopped
    env_file: .env
    working_dir: /code
    volumes:
      - ./backend:/code
      - media_data:/code/media
    depends_on:
      redis:
        condition: service_healthy
    command: >
      sh -c "python manage.py makemigrations core &&
             python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120"

  celery:
    build: ./backend
    restart: unless-stopped
    env_file: .env
    working_dir: /code
    volumes:
      - ./backend:/code
      - media_data:/code/media
    depends_on:
      redis:
        condition: service_healthy
    command: celery -A config worker --loglevel=info --concurrency=2

  frontend:
    build: ./frontend
    restart: unless-stopped
    environment:
      - VITE_API_URL=https://${DOMAIN}/api
      - VITE_BACKEND_URL=https://${DOMAIN}
    volumes:
      - ./frontend:/app
    command: sh -c "cd /app && npm install --prefer-offline --no-audit && npm run dev -- --host 0.0.0.0 --port 5173"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx-prod.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - media_data:/code/media
    depends_on:
      - backend
      - frontend

  webhook:
    build: ./deploy/webhook
    restart: unless-stopped
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/unibot:/opt/unibot
    environment:
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - APP_DIR=/opt/unibot

volumes:
  redis_data:
  media_data:
COMPOSE

# Reemplazar $DOMAIN en el compose
sed -i "s/\${DOMAIN}/$DOMAIN/g" docker-compose.prod.yml
sed -i "s/\${WEBHOOK_SECRET}/$WEBHOOK_SECRET/g" docker-compose.prod.yml

log "docker-compose.prod.yml creado"

# Crear nginx config para producción con SSL
mkdir -p deploy
cat > deploy/nginx-prod.conf <<NGINX
upstream backend {
    server backend:8000;
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Media files
    location /media/ {
        alias /code/media/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Static files
    location /static/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
    }

    # Admin
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        client_max_body_size 50M;
        proxy_read_timeout 300s;
    }

    # Frontend
    location / {
        proxy_pass http://frontend:5173;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

log "Nginx prod config creado"

# Obtener certificado SSL (paramos nginx temporalmente)
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
    warn "No se pudo obtener certificado SSL. Asegurate que el dominio $DOMAIN apunte a esta IP."
    warn "Podés ejecutar después: certbot certonly --standalone -d $DOMAIN"
}

# Auto-renovar certificados
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker compose -f $APP_DIR/docker-compose.prod.yml restart nginx") | crontab -
log "SSL configurado con auto-renovación"

# ============================================================
step "6/6 — Levantando la aplicación"
# ============================================================
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ UniBot desplegado exitosamente!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 App:      ${CYAN}https://$DOMAIN${NC}"
echo -e "  🔗 Webhook:  ${CYAN}https://$DOMAIN:9000/hooks/deploy${NC}"
echo -e "  🔑 Secret:   ${YELLOW}$WEBHOOK_SECRET${NC}"
echo ""
echo -e "  ${YELLOW}IMPORTANTE:${NC}"
echo -e "  1. Editá tu GROQ_API_KEY: ${CYAN}nano $APP_DIR/.env${NC}"
echo -e "  2. Agregá el webhook en GitHub:"
echo -e "     URL: https://$DOMAIN:9000/hooks/deploy"
echo -e "     Secret: $WEBHOOK_SECRET"
echo -e "     Content type: application/json"
echo -e "     Events: Just the push event"
echo ""
echo -e "  📋 Comandos útiles:"
echo -e "     Ver logs:     ${CYAN}docker compose -f $APP_DIR/docker-compose.prod.yml logs -f${NC}"
echo -e "     Reiniciar:    ${CYAN}docker compose -f $APP_DIR/docker-compose.prod.yml restart${NC}"
echo -e "     Reconstruir:  ${CYAN}docker compose -f $APP_DIR/docker-compose.prod.yml up -d --build${NC}"
echo ""
