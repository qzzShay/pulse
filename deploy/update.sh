#!/usr/bin/env bash
# Pulse: update to the newest code and restart. Run as root from the project folder:
#   sudo bash deploy/update.sh
# Takes a database backup first. Pulls from git when the folder is a git checkout;
# otherwise unpack the new release over this folder before running it.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== Backup vor dem Update"
docker compose exec -T app node scripts/backup.mjs || echo "Backup übersprungen (App lief nicht)."

if [ -d .git ]; then
  echo "== Neuesten Code holen"
  git pull --ff-only
fi

echo "== Neu bauen und starten"
docker compose up -d --build
docker image prune -f >/dev/null
echo "Fertig."
