#!/bin/bash
set -euo pipefail

# ============================================
# Agentbase — Database Backup
# ============================================
# Usage: bash deploy/scripts/backup.sh [output_dir]

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

# Load environment
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

POSTGRES_USER="${POSTGRES_USER:-agentbase}"
POSTGRES_DB="${POSTGRES_DB:-agentbase}"
MONGO_USER="${MONGO_USER:-agentbase}"

echo "📦 Starting backup: $TIMESTAMP"
mkdir -p "$BACKUP_PATH"

# --- PostgreSQL ---
echo "🐘 Backing up PostgreSQL..."
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_PATH/postgres_${POSTGRES_DB}.sql.gz"
echo "   ✅ PostgreSQL: $(du -h "$BACKUP_PATH/postgres_${POSTGRES_DB}.sql.gz" | cut -f1)"

# --- MongoDB ---
echo "🍃 Backing up MongoDB..."
docker compose -f docker-compose.prod.yml exec -T mongo \
  mongodump --uri="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@localhost:27017/agentbase?authSource=admin" \
  --archive --gzip \
  > "$BACKUP_PATH/mongo_agentbase.archive.gz"
echo "   ✅ MongoDB: $(du -h "$BACKUP_PATH/mongo_agentbase.archive.gz" | cut -f1)"

# --- Summary ---
TOTAL_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo ""
echo "✅ Backup complete: $BACKUP_PATH ($TOTAL_SIZE)"
echo ""
echo "Files:"
ls -lh "$BACKUP_PATH/"
echo ""

# --- Cleanup old backups (keep last 7) ---
BACKUP_COUNT=$(ls -1d "$BACKUP_DIR"/*/ 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 7 ]; then
  echo "🧹 Cleaning old backups (keeping last 7)..."
  ls -1dt "$BACKUP_DIR"/*/ | tail -n +8 | xargs rm -rf
  echo "   Done"
fi

echo ""
echo "To restore PostgreSQL:"
echo "  gunzip -c $BACKUP_PATH/postgres_${POSTGRES_DB}.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB"
echo ""
echo "To restore MongoDB:"
echo "  docker compose -f docker-compose.prod.yml exec -T mongo mongorestore --uri='...' --archive --gzip < $BACKUP_PATH/mongo_agentbase.archive.gz"
