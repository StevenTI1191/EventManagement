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
echo "[1/5] Pulling latest code..."
git pull

# ── 2. Bangun SEMUA image lebih dulu ──────────────────────────────────────
# Bagian paling lama dikerjakan sekaligus di sini, selagi yang lama tetap
# melayani pengunjung. Belum ada yang berubah bagi peramban pada langkah ini.
#
# PENTING: image node_builder harus ikut dibangun ulang! Kalau tidak, ia
# memakai source lama yang ter-bake di image (COPY . .) → frontend tak update.
echo "[2/5] Membangun image (frontend & PHP)..."
docker compose build node_builder app queue

# ── 3. Terbitkan aset frontend ────────────────────────────────────────────
# Aset ditulis ke ./public/build milik host, yang LANGSUNG disajikan Nginx.
# Sejak detik ini peramban memuat JS baru, sedangkan PHP baru aktif pada
# langkah berikutnya. Selama jeda itu, daftar rute yang disuntikkan @routes
# masih milik kode lama — pemanggilan rute baru dari JS akan gagal.
# Karena itu penerbitan aset sengaja diletakkan SESUDAH semua build selesai,
# supaya jedanya tinggal hitungan detik, bukan selama proses build.
echo "[3/5] Menerbitkan aset frontend..."
docker compose --profile build run --rm node_builder

# ── 4. Naikkan service PHP ────────────────────────────────────────────────
echo "[4/5] Menaikkan service..."
docker compose up -d --no-deps app queue reverb scheduler

# ── 5. Terapkan perubahan pada nginx ──────────────────────────────────────
# `nginx -s reload` HANYA memuat ulang berkas config. Perubahan pada daftar
# volume — misalnya folder unggahan baru yang harus ikut disajikan Nginx —
# tidak akan berlaku sebelum containernya dibuat ulang. `up -d` hanya membuat
# ulang bila definisi servicenya memang berubah, jadi aman dipanggil rutin.
echo "[5/5] Menerapkan perubahan nginx..."
docker compose up -d --no-deps nginx
docker compose exec nginx nginx -s reload

echo ""
echo "======================================================"
echo "  Update selesai!"
echo "======================================================"
