#!/usr/bin/env bash
# Run once from your LOCAL machine after server-setup.sh is done.
# Pushes the app to the server for the first time.
# Usage: bash deploy/first-deploy.sh <server-ip>
set -euo pipefail

SERVER_IP="${1:?Usage: bash deploy/first-deploy.sh <server-ip>}"
DEPLOY_USER="deployer"
APP_DIR="/var/www/groceries-api"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Syncing files to ${SERVER_IP}:${APP_DIR}"
rsync -az --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='storage/app/backups' \
    --exclude='.env' \
    "$LOCAL_DIR/" \
    "${DEPLOY_USER}@${SERVER_IP}:${APP_DIR}/"

echo "==> Uploading .env.production"
scp "${LOCAL_DIR}/deploy/.env.production" "${DEPLOY_USER}@${SERVER_IP}:${APP_DIR}/.env"

echo "==> Running remote setup"
ssh "${DEPLOY_USER}@${SERVER_IP}" bash <<'REMOTE'
set -euo pipefail
APP_DIR="/var/www/groceries-api"
cd "$APP_DIR"

# Storage setup
mkdir -p storage/app/public storage/app/backups storage/framework/{cache,sessions,views} bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Create SQLite database
touch database/database.sqlite
chmod 664 database/database.sqlite
chown www-data:www-data database/database.sqlite

# Install dependencies
composer install --no-dev --optimize-autoloader --quiet

# Run migrations
php artisan migrate --force

# Create storage symlink
php artisan storage:link --force

# Cache config + routes
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ First deploy done!"
REMOTE

echo ""
echo "✅ App is live at https://api.thijssensoftware.nl"
echo "   Run 'bash deploy/deploy.sh <server-ip>' for future deployments."
