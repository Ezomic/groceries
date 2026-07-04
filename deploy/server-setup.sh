#!/usr/bin/env bash
# Run once on a fresh Ubuntu 24.04 DigitalOcean droplet as root.
# Usage: bash server-setup.sh your@email.com
set -euo pipefail

EMAIL="${1:?Usage: bash server-setup.sh your@email.com}"
DOMAIN="api.thijssensoftware.nl"
APP_DIR="/var/www/groceries-api"
PHP_VERSION="8.4"

echo "==> Updating system packages"
apt-get update -qq && apt-get upgrade -y -qq

echo "==> Installing dependencies"
apt-get install -y -qq \
    curl git unzip nginx certbot python3-certbot-nginx \
    software-properties-common

echo "==> Adding PHP ${PHP_VERSION} PPA"
add-apt-repository -y ppa:ondrej/php
apt-get update -qq

echo "==> Installing PHP ${PHP_VERSION} and extensions"
apt-get install -y -qq \
    php${PHP_VERSION}-fpm \
    php${PHP_VERSION}-cli \
    php${PHP_VERSION}-sqlite3 \
    php${PHP_VERSION}-mbstring \
    php${PHP_VERSION}-xml \
    php${PHP_VERSION}-curl \
    php${PHP_VERSION}-zip \
    php${PHP_VERSION}-bcmath \
    php${PHP_VERSION}-tokenizer

echo "==> Installing Composer"
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

echo "==> Creating app directory"
mkdir -p "$APP_DIR"
chown www-data:www-data "$APP_DIR"

echo "==> Writing Nginx config"
cat > /etc/nginx/sites-available/groceries-api <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};
    root ${APP_DIR}/public;
    index index.php;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    charset utf-8;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php${PHP_VERSION}-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    client_max_body_size 20M;
}
NGINX

ln -sf /etc/nginx/sites-available/groceries-api /etc/nginx/sites-enabled/groceries-api
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> Obtaining SSL certificate"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL"

echo "==> Setting up deploy user"
id -u deployer &>/dev/null || useradd -m -s /bin/bash deployer
mkdir -p /home/deployer/.ssh
# Copy root's authorized_keys so your SSH key works for deployer too
cp /root/.ssh/authorized_keys /home/deployer/.ssh/ 2>/dev/null || true
chmod 700 /home/deployer/.ssh
chmod 600 /home/deployer/.ssh/authorized_keys 2>/dev/null || true
chown -R deployer:deployer /home/deployer/.ssh
echo "deployer ALL=(ALL) NOPASSWD: /bin/systemctl reload php${PHP_VERSION}-fpm, /bin/systemctl reload nginx" \
    >> /etc/sudoers.d/deployer

chown -R deployer:www-data "$APP_DIR"
chmod -R 775 "$APP_DIR"

echo ""
echo "✅ Server setup complete!"
echo "   Next: run deploy/first-deploy.sh from your local machine."
