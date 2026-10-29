#!/usr/bin/env bash
# Setup of the portfolio on a DigitalOcean droplet (Ubuntu 22.04/24.04) that may already host other sites.
#
#   curl -fsSL https://raw.githubusercontent.com/ignitechvn/Nguyen-Hai-Nam/main/deploy/setup-droplet.sh -o setup.sh
#   sudo DOMAIN=hainamnguyen.com EMAIL=you@example.com bash setup.sh
#
# It only adds its own nginx site for DOMAIN: other nginx sites, the default site and the system
# Node.js are left untouched (the build uses a private Node.js inside /opt/portfolio).
set -euo pipefail

REPO="${REPO:-https://github.com/ignitechvn/Nguyen-Hai-Nam.git}"
BRANCH="${BRANCH:-main}"
APP_DIR=/opt/portfolio
WEB_ROOT=/var/www/portfolio
NODE_VERSION=22.11.0
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

if [ -z "$DOMAIN" ]; then
  echo "DOMAIN is required (e.g. DOMAIN=hainamnguyen.com), so the site only answers for its own domain." >&2
  exit 1
fi

echo "==> Installing nginx, git, rsync (if missing)"
apt-get update -y
apt-get install -y nginx git curl ca-certificates rsync xz-utils

echo "==> Fetching the site"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

echo "==> Building with a private Node.js $NODE_VERSION (system Node.js is not changed)"
bash "$APP_DIR/deploy/build.sh"

echo "==> Adding the nginx site for $DOMAIN"
sed "s/__SERVER_NAME__/$DOMAIN www.$DOMAIN/" "$APP_DIR/deploy/nginx.conf" > /etc/nginx/sites-available/portfolio
ln -sf /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/portfolio
if ! nginx -t; then
  echo "nginx config test failed: removing the portfolio site again, nothing else was changed." >&2
  rm -f /etc/nginx/sites-enabled/portfolio
  exit 1
fi
systemctl reload nginx

if [ -n "$EMAIL" ]; then
  CONTACT=(--email "$EMAIL")
else
  CONTACT=(--register-unsafely-without-email)
fi
echo "==> Requesting an HTTPS certificate for $DOMAIN"
apt-get install -y certbot python3-certbot-nginx
certbot --nginx --non-interactive --agree-tos --redirect "${CONTACT[@]}" -d "$DOMAIN" -d "www.$DOMAIN"

echo
echo "Done: https://$DOMAIN"
echo "Later updates: sudo bash $APP_DIR/deploy/update.sh"
