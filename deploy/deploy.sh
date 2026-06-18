#!/bin/bash
# ============================================================
#  UniBot — Deploy script (ejecutado por el webhook)
#  Hace: git pull → docker compose build → recreate containers
# ============================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/unibot}"
COMPOSE_FILE="docker-compose.prod.yml"
LOG_FILE="$APP_DIR/deploy/deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

log "═══ Deploy iniciado ═══"

cd "$APP_DIR"

# 1. Pull latest code
log "Pulling latest code..."
git pull origin main 2>&1 | tee -a "$LOG_FILE"

# 2. Rebuild and recreate changed containers
log "Building and recreating containers..."
docker compose -f "$COMPOSE_FILE" up -d --build --force-recreate 2>&1 | tee -a "$LOG_FILE"

# 3. Cleanup old images
log "Cleaning up old images..."
docker image prune -f 2>&1 | tee -a "$LOG_FILE"

log "═══ Deploy completado ═══"
