#!/usr/bin/env bash
# Ongoing deployment script. Run from your LOCAL machine.
# Usage: bash deploy/deploy.sh <server-ip>
set -euo pipefail

SERVER_IP="${1:?Usage: bash deploy/deploy.sh <server-ip>}"
DEPLOY_USER="deployer"
APP_DIR="/var/www/groceries-api"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Syncing files"
rsync -az --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='storage/app/backups' \
    --exclude='.env' \
    "$LOCAL_DIR/" \
    "${DEPLOY_USER}@${SERVER_IP}:${APP_DIR}/"

echo "==> Running remote deploy"
ssh "${DEPLOY_USER}@${SERVER_IP}" bash <<'REMOTE'
set -euo pipefail
APP_DIR="/var/www/groceries-api"
cd "$APP_DIR"

php artisan down

composer install --no-dev --optimize-autoloader --quiet
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

php artisan up
echo "✅ Deploy complete"
REMOTE
