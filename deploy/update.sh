#!/usr/bin/env bash
# Pull the latest main branch, rebuild and publish. Run on the droplet: sudo bash /opt/portfolio/deploy/update.sh
set -euo pipefail

APP_DIR=/opt/portfolio
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"
git fetch --depth 1 origin "$BRANCH"
git reset --hard "origin/$BRANCH"
bash "$APP_DIR/deploy/build.sh"
echo "Published $(git rev-parse --short HEAD)"
