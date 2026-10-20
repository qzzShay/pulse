#!/usr/bin/env bash
# Pulse: one-time VPS setup for Ubuntu 22.04/24.04 or Debian 12. Run as root from the project folder:
#   sudo bash deploy/setup.sh pulse.example.com
# Installs Docker, opens the firewall for SSH/HTTP/HTTPS, writes .env, starts app + Caddy (HTTPS),
# and schedules a nightly database backup. Safe to run again: existing .env and data are kept.
set -euo pipefail

DOMAIN="${1:-${DOMAIN:-}}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\033[31mFehler: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Bitte mit sudo oder als root ausführen."
[ -f "$APP_DIR/docker-compose.yml" ] || die "docker-compose.yml nicht gefunden. Starte das Skript im Pulse-Ordner."
. /etc/os-release 2>/dev/null || true
case "${ID:-}" in ubuntu|debian) ;; *) die "Unterstützt sind Ubuntu und Debian (gefunden: ${PRETTY_NAME:-unbekannt})." ;; esac

if [ -z "$DOMAIN" ]; then read -rp "Domain für Pulse (z. B. pulse.example.com): " DOMAIN; fi
[ -n "$DOMAIN" ] || die "Ohne Domain kann Caddy kein HTTPS-Zertifikat holen."
DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%%/*}"

say "Pakete installieren"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git openssl ufw dnsutils >/dev/null

if ! command -v docker >/dev/null 2>&1; then
  say "Docker installieren"
  curl -fsSL https://get.docker.com | sh >/dev/null
fi
systemctl enable --now docker >/dev/null
docker compose version >/dev/null 2>&1 || die "Docker Compose fehlt. Installiere das Paket docker-compose-plugin."

MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$MEM_MB" -lt 2000 ] && ! swapon --show | grep -q .; then
  say "2 GB Swap anlegen (der Build braucht mehr als ${MEM_MB} MB RAM)"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "Firewall: SSH, HTTP und HTTPS erlauben"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null

say "Konfiguration (.env)"
cd "$APP_DIR"
if [ ! -f .env ]; then
  cat > .env <<EOF
DOMAIN=$DOMAIN
SITE_URL=https://$DOMAIN
BRAND=pulse
SESSION_SECRET=$(openssl rand -hex 32)
EOF
  chmod 600 .env
  echo ".env angelegt (SESSION_SECRET wurde zufällig erzeugt)."
else
  echo ".env existiert schon und bleibt unverändert."
fi
mkdir -p data backups
chown -R 1001:1001 data backups

SERVER_IP=$(curl -fsS4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
DNS_IP=$(dig +short A "$DOMAIN" | tail -n1)
if [ "$DNS_IP" != "$SERVER_IP" ]; then
  printf '\n\033[33mHinweis: %s zeigt auf "%s", dieser Server hat %s.\nLege beim Domain-Anbieter einen A-Eintrag %s -> %s an. Caddy holt das Zertifikat, sobald der Eintrag stimmt.\033[0m\n' \
    "$DOMAIN" "${DNS_IP:-nichts}" "$SERVER_IP" "$DOMAIN" "$SERVER_IP"
fi

say "App bauen und starten (das dauert beim ersten Mal ein paar Minuten)"
docker compose up -d --build

say "Nächtliches Backup um 03:30 einrichten"
cat > /etc/cron.d/pulse-backup <<EOF
30 3 * * * root cd $APP_DIR && docker compose exec -T app node scripts/backup.mjs >> /var/log/pulse-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/pulse-backup

say "Warten, bis die App antwortet"
for _ in $(seq 1 60); do
  if docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    printf '\n\033[32mFertig. Öffne https://%s/login und lege dein Owner-Konto an.\033[0m\n' "$DOMAIN"
    printf 'Updates: sudo bash deploy/update.sh   ·   Backups liegen in %s/backups\n' "$APP_DIR"
    exit 0
  fi
  sleep 3
done
die "Die App antwortet nicht. Logs ansehen mit: docker compose logs app"
