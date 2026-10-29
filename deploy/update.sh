#!/usr/bin/env bash
# Pull the latest main branch, rebuild and publish. Run on the droplet: sudo bash /opt/portfolio/deploy/update.sh
set -euo pipefail

APP_DIR=/opt/portfolio
WEB_ROOT=/var/www/portfolio
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"
git fetch --depth 1 origin "$BRANCH"
git reset --hard "origin/$BRANCH"
npm ci --no-audit --no-fund
npm run build
rsync -a --delete lib/ "$WEB_ROOT/"
echo "Published $(git rev-parse --short HEAD) to $WEB_ROOT"
