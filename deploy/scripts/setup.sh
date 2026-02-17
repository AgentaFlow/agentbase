#!/bin/bash
set -euo pipefail

# ============================================
# Agentbase — Initial Server Setup
# ============================================
# Usage: bash deploy/scripts/setup.sh
#
# Prerequisites:
#   - Docker & Docker Compose installed
#   - Domain pointed to this server's IP

echo "===================================="
echo "  Agentbase Setup"
echo "===================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

# --- Generate .env if missing ---
if [ ! -f .env ]; then
  echo "📋 Creating .env from template..."
  cp .env.example .env

  # Generate secure random secrets
  JWT_SECRET=$(openssl rand -base64 48)
  JWT_REFRESH_SECRET=$(openssl rand -base64 48)
  POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
  MONGO_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
  REDIS_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)

  # Inject secrets into .env
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
  sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" .env
  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" .env
  sed -i "s|MONGO_PASSWORD=.*|MONGO_PASSWORD=${MONGO_PASSWORD}|" .env  
  sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASSWORD}|" .env

  echo "✅ .env created with secure random secrets"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env and set:"
  echo "   - FRONTEND_URL (your domain, e.g., https://app.agentbase.dev)"
  echo "   - OPENAI_API_KEY, ANTHROPIC_API_KEY, and/or GEMINI_API_KEY"
  echo "   - STRIPE_SECRET_KEY (if using billing)"
  echo "   - SMTP_HOST, SMTP_USER, SMTP_PASSWORD (for emails)"
  echo ""
  read -p "Press Enter after editing .env, or Ctrl+C to exit..."
fi

# --- SSL setup ---
SSL_DIR="deploy/nginx/ssl"
if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
  echo "🔐 No SSL certificates found. Generating self-signed certs for development..."
  mkdir -p "$SSL_DIR"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/privkey.pem" \
    -out "$SSL_DIR/fullchain.pem" \
    -subj "/CN=localhost/O=Agentbase/C=US" 2>/dev/null
  echo "✅ Self-signed certificates generated"
  echo "   For production, use: bash deploy/scripts/ssl-setup.sh yourdomain.com"
fi

# --- Create log directory ---
mkdir -p deploy/nginx/logs

# --- Build and start ---
echo ""
echo "🔨 Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo ""
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# --- Health check ---
echo ""
echo "🔍 Health check..."
if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "✅ Core API: healthy"
else
  echo "⚠️  Core API: not responding yet (may still be starting)"
fi

if curl -sf http://localhost:8000/api/ai/health > /dev/null 2>&1; then
  echo "✅ AI Service: healthy"
else
  echo "⚠️  AI Service: not responding yet"
fi

echo ""
echo "===================================="
echo "  Setup Complete!"
echo "===================================="
echo ""
echo "Services:"
echo "  Frontend:   https://localhost (or your domain)"
echo "  API:        https://localhost/api"
echo "  AI Service: https://localhost/ai"
echo "  API Docs:   https://localhost/api/docs"
echo ""
echo "Useful commands:"
echo "  docker compose -f docker-compose.prod.yml logs -f      # View logs"
echo "  docker compose -f docker-compose.prod.yml down          # Stop"
echo "  docker compose -f docker-compose.prod.yml up -d --build # Rebuild"
echo "  bash deploy/scripts/backup.sh                           # Backup databases"
echo ""
