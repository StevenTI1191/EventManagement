#!/bin/bash
# =============================================================================
# update.sh — Update kode yang sudah berjalan di server
# Cara pakai: bash docker/scripts/update.sh
# =============================================================================
set -e

echo ""
echo "======================================================"
echo "  EventManagement — Update"
echo "======================================================"

# ── 1. Pull kode terbaru ───────────────────────────────────────────────────
echo "[1/4] Pulling latest code..."
git pull

# ── 2. Rebuild frontend jika ada perubahan JS/CSS ─────────────────────────
# PENTING: rebuild image node_builder dulu! Kalau tidak, ia memakai source
# lama yang ter-bake di image (COPY . .) → frontend tidak pernah update.
echo "[2/4] Rebuilding frontend assets..."
docker compose build node_builder
docker compose --profile build run --rm node_builder

# ── 3. Rebuild PHP image + restart ────────────────────────────────────────
echo "[3/4] Rebuilding PHP image..."
docker compose build app queue

echo "      Restarting services..."
docker compose up -d --no-deps app queue reverb scheduler

# ── 4. Reload nginx (config/static files mungkin berubah) ─────────────────
echo "[4/4] Reloading nginx..."
docker compose exec nginx nginx -s reload

echo ""
echo "======================================================"
echo "  Update selesai!"
echo "======================================================"
