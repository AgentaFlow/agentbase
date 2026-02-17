#!/bin/bash
set -euo pipefail

# ============================================
# Agentbase — Let's Encrypt SSL Setup
# ============================================
# Usage: bash deploy/scripts/ssl-setup.sh yourdomain.com [email@example.com]

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ]; then
  echo "Usage: bash deploy/scripts/ssl-setup.sh yourdomain.com [email@example.com]"
  exit 1
fi

SSL_DIR="deploy/nginx/ssl"
WEBROOT_DIR="/tmp/certbot-webroot"

echo "🔐 Setting up SSL for: $DOMAIN"

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
  echo "📦 Installing certbot..."
  apt-get update && apt-get install -y certbot
fi

# Create webroot for ACME challenge
mkdir -p "$WEBROOT_DIR"

# Get certificate
EMAIL_FLAG=""
if [ -n "$EMAIL" ]; then
  EMAIL_FLAG="--email $EMAIL"
else
  EMAIL_FLAG="--register-unsafely-without-email"
fi

certbot certonly --webroot \
  -w "$WEBROOT_DIR" \
  -d "$DOMAIN" \
  $EMAIL_FLAG \
  --agree-tos \
  --non-interactive

# Copy certs to nginx ssl dir
mkdir -p "$SSL_DIR"
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"

echo "✅ SSL certificates installed"

# Reload nginx
echo "🔄 Reloading nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload 2>/dev/null || true

echo ""
echo "✅ SSL setup complete for $DOMAIN"
echo ""
echo "Auto-renewal cron (add with: crontab -e):"
echo "  0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/*.pem $(pwd)/$SSL_DIR/ && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload"
