#!/bin/sh
set -e

# Hanya jalankan setup saat command adalah php-fpm (bukan queue worker dll.)
if [ "$1" = "php-fpm" ]; then
    echo "==> Menyiapkan folder unggahan..."
    # Folder-folder ini dipasangi volume bersama. Volume yang BARU dibuat
    # mewarisi kepemilikan dari image, sedangkan volume LAMA mempertahankan
    # kepemilikannya sendiri — keduanya bisa berakhir milik root sehingga
    # PHP-FPM gagal menulis, dan itu baru ketahuan saat pengguna mengunggah.
    # Dijalankan tiap start karena murah dan menutup kedua kemungkinan itu
    # tanpa bergantung pada urutan pembuatan volume.
    for d in public/posters public/venue; do
        mkdir -p "$d"
        chown -R www-data:www-data "$d" 2>/dev/null || true
        chmod -R 775 "$d" 2>/dev/null || true
    done

    echo "==> Menjalankan database migrations..."
    php artisan migrate --force

    echo "==> Meng-cache config / routes / views..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache

    echo "==> Storage symlink..."
    # Buat symlink jika belum ada (public/storage -> storage/app/public)
    php artisan storage:link --quiet 2>/dev/null || true

    echo "==> App siap."
fi

exec "$@"
