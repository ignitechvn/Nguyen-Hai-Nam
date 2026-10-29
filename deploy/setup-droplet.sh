#!/usr/bin/env bash
# One-time setup of a DigitalOcean droplet (Ubuntu 22.04/24.04) to serve the portfolio with nginx.
#
#   curl -fsSL https://raw.githubusercontent.com/ignitechvn/Nguyen-Hai-Nam/main/deploy/setup-droplet.sh -o setup.sh
#   sudo DOMAIN=hainamnguyen.com EMAIL=you@example.com bash setup.sh
#
# DOMAIN is optional: without it the site is served on the droplet's IP over plain HTTP.
# With DOMAIN (its DNS A record must already point to this droplet) a free HTTPS certificate is issued.
set -euo pipefail

REPO="${REPO:-https://github.com/ignitechvn/Nguyen-Hai-Nam.git}"
BRANCH="${BRANCH:-main}"
APP_DIR=/opt/portfolio
WEB_ROOT=/var/www/portfolio
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

echo "==> Installing nginx, git and Node.js 22"
apt-get update -y
apt-get install -y nginx git curl ca-certificates rsync
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Fetching the site"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

echo "==> Building"
cd "$APP_DIR"
npm ci --no-audit --no-fund
npm run build
mkdir -p "$WEB_ROOT"
rsync -a --delete lib/ "$WEB_ROOT/"

echo "==> Configuring nginx"
SERVER_NAME="${DOMAIN:-_}"
[ -n "$DOMAIN" ] && SERVER_NAME="$DOMAIN www.$DOMAIN"
sed "s/__SERVER_NAME__/$SERVER_NAME/" "$APP_DIR/deploy/nginx.conf" > /etc/nginx/sites-available/portfolio
ln -sf /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/portfolio
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 'Nginx Full'
fi

if [ -n "$DOMAIN" ]; then
  echo "==> Requesting an HTTPS certificate for $DOMAIN"
  apt-get install -y certbot python3-certbot-nginx
  if [ -n "$EMAIL" ]; then
    CONTACT=(--email "$EMAIL")
  else
    CONTACT=(--register-unsafely-without-email)
  fi
  certbot --nginx --non-interactive --agree-tos --redirect "${CONTACT[@]}" -d "$DOMAIN" -d "www.$DOMAIN"
fi

echo
echo "Done. Site: ${DOMAIN:+https://$DOMAIN}${DOMAIN:-http://$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')}"
echo "Later updates: sudo bash $APP_DIR/deploy/update.sh"
