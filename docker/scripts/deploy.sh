#!/bin/bash
# =============================================================================
# deploy.sh — Deploy pertama kali EventManagement ke VPS
#
# Cara pakai:
#   1. git clone <repo> ke server, isi .env
#   2. bash docker/scripts/deploy.sh
# =============================================================================
set -e

DOMAIN="laksamanamuda.my.id"
BACKSTAGE="backstage.laksamanamuda.my.id"
EMAIL="${CERTBOT_EMAIL:-achensteven2005@gmail.com}"
NGINX_CONF="./docker/nginx/conf.d"

echo ""
echo "======================================================"
echo "  EventManagement — Deploy Pertama"
echo "  Client   : https://$DOMAIN"
echo "  Backstage: https://$BACKSTAGE"
echo "======================================================"
echo ""

# ── Pastikan .env ada ──────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    echo "[ERROR] File .env tidak ditemukan!"
    echo "        Jalankan: cp .env.example .env && nano .env"
    exit 1
fi

# ── 1. Build frontend assets ───────────────────────────────────────────────
echo "[1/6] Building frontend assets (React + Tailwind)..."
docker compose --profile build run --rm node_builder
echo "      Frontend assets siap di ./public/build/"

# ── 2. Build PHP app image ────────────────────────────────────────────────
echo "[2/6] Building PHP app image..."
docker compose build app queue

# ── 3. Start semua service KECUALI nginx (belum ada SSL) ──────────────────
echo "[3/6] Starting MySQL, Redis, App, Queue, Reverb, Scheduler, Certbot..."
docker compose up -d mysql redis app queue reverb scheduler certbot

# Pakai config HTTP-only dulu
echo "      Menggunakan config HTTP-only sementara..."
cp "$NGINX_CONF/app.conf" "$NGINX_CONF/app.conf.bak" 2>/dev/null || true
cp "$NGINX_CONF/app-init.conf" "$NGINX_CONF/app.conf"

docker compose up -d nginx
sleep 3

# ── 4. Minta SSL certificate dari Let's Encrypt ───────────────────────────
echo "[4/6] Meminta SSL certificate dari Let's Encrypt..."
echo "      Pastikan DNS sudah mengarah ke server ini sebelum lanjut!"
echo ""
read -p "      Tekan ENTER untuk lanjut, atau Ctrl+C untuk batal..."

docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    -d "$BACKSTAGE"

echo "      SSL certificate berhasil didapat!"

# ── 5. Aktifkan config HTTPS ──────────────────────────────────────────────
echo "[5/6] Mengaktifkan config HTTPS..."
cp "$NGINX_CONF/app.conf.bak" "$NGINX_CONF/app.conf" 2>/dev/null || true

# Reload nginx dengan config HTTPS
docker compose exec nginx nginx -s reload
echo "      Nginx sekarang melayani HTTPS."

# ── 6. Verifikasi ──────────────────────────────────────────────────────────
echo "[6/6] Verifikasi..."
sleep 2
docker compose ps

echo ""
echo "======================================================"
echo "  Deploy selesai!"
echo ""
echo "  Client   : https://$DOMAIN"
echo "  Backstage: https://$BACKSTAGE"
echo ""
echo "  Perintah berguna:"
echo "  - Lihat logs  : docker compose logs -f app"
echo "  - Restart app : docker compose restart app"
echo "  - Update kode : bash docker/scripts/update.sh"
echo "======================================================"
