#!/bin/sh
set -e

# Hanya jalankan setup saat command adalah php-fpm (bukan queue worker dll.)
if [ "$1" = "php-fpm" ]; then
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
