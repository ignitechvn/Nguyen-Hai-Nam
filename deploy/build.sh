#!/usr/bin/env bash
# Build the site with a private Node.js kept in /opt/portfolio/.node and publish it to /var/www/portfolio.
# Never touches the system Node.js used by other apps on the server.
set -euo pipefail

APP_DIR=/opt/portfolio
WEB_ROOT=/var/www/portfolio
NODE_VERSION=22.11.0
NODE_DIR="$APP_DIR/.node"

if [ ! -x "$NODE_DIR/bin/node" ] || [ "$("$NODE_DIR/bin/node" -v)" != "v$NODE_VERSION" ]; then
  case "$(uname -m)" in
    x86_64) ARCH=x64 ;;
    aarch64) ARCH=arm64 ;;
    *) echo "Unsupported CPU: $(uname -m)" >&2; exit 1 ;;
  esac
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH.tar.xz" \
    | tar -xJ -C "$NODE_DIR" --strip-components=1
fi

cd "$APP_DIR"
PATH="$NODE_DIR/bin:$PATH" npm ci --no-audit --no-fund
PATH="$NODE_DIR/bin:$PATH" npm run build
mkdir -p "$WEB_ROOT"
rsync -a --delete lib/ "$WEB_ROOT/"
