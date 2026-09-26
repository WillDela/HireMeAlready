#!/usr/bin/env bash
# Deploys the current working tree to the droplet and rebuilds the stack.
# Usage: scripts/deploy.sh
# The droplet keeps its own production .env at /opt/hiremealready/.env (never synced).
set -euo pipefail

HOST="${DEPLOY_HOST:-root@104.131.187.142}"
DIR=/opt/hiremealready

cd "$(dirname "$0")/.."

rsync -az --delete \
  --exclude .git --exclude node_modules --exclude .next --exclude src/generated \
  --include .env.example --exclude '.env' --exclude '.env.*' \
  --exclude .claude --exclude .agents --exclude .windsurf \
  ./ "$HOST:$DIR/"

# rsync replaces files rather than editing them, and single-file bind mounts keep
# pointing at the old copy, so restart the services that read mounted config.
ssh "$HOST" "cd $DIR && docker compose up -d --build --remove-orphans \
  && docker compose restart caddy coturn \
  && docker image prune -f >/dev/null && docker compose ps"
