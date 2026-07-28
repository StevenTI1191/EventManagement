# =============================================================================
# Stage 1 — Build frontend assets (Vite + React)
# =============================================================================
FROM node:20-alpine AS assets
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
# Nilai publik Reverb di-inject saat build (browser butuh ini; .env tidak terbaca
# karena dikecualikan .dockerignore). Aman: VITE_REVERB_APP_KEY memang key publik.
ARG VITE_REVERB_APP_KEY=
ARG VITE_REVERB_HOST=
ARG VITE_REVERB_PORT=443
ARG VITE_REVERB_SCHEME=https
ENV VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME
RUN npm run build


# =============================================================================
# Stage 2 — PHP-FPM application (production)
# =============================================================================
FROM php:8.2-fpm-alpine AS app

# Install system dependencies
# tesseract-ocr + data bahasa Indonesia dipakai untuk membaca bukti transfer
# yang diunggah klien (deteksi nominal & penyaringan gambar yang jelas bukan
# bukti transfer). Berjalan lokal — bukti pembayaran tidak dikirim ke pihak ketiga.
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    oniguruma-dev \
    icu-dev \
    linux-headers \
    tesseract-ocr \
    tesseract-ocr-data-ind

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache

# Install Redis extension
RUN apk add --no-cache $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install PHP dependencies first (layer cache)
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-scripts \
    --no-interaction

# Copy full source code
COPY . .

# Copy compiled frontend assets from Stage 1
COPY --from=assets /app/public/build ./public/build

# Set proper permissions
# Hanya folder yang benar-benar ditulis www-data (PHP-FPM) yang diberikan.
# JANGAN chown -R seluruh /var/www/html: di overlayfs itu memaksa copy-up
# puluhan ribu file vendor/ → build bisa macet berjam-jam di VPS disk lambat.
#
# public/posters dan public/venue menampung berkas unggahan dan keduanya
# dipasangi volume bersama di docker-compose. Docker menyalin isi folder
# BESERTA kepemilikannya saat volume dibuat pertama kali, jadi bila di sini
# masih milik root, www-data tidak akan pernah bisa menulis ke volumenya.
# Isinya sedikit, sehingga copy-up-nya murah.
RUN mkdir -p public/posters public/venue \
    && chown -R www-data:www-data storage bootstrap/cache public/posters public/venue \
    && chmod -R 775 storage bootstrap/cache public/posters public/venue

# Copy PHP production settings
COPY docker/php/php.ini $PHP_INI_DIR/conf.d/99-app.ini

# Copy & set executable entrypoint
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]


# =============================================================================
# Stage 3 — Node builder (dipakai di VPS untuk build frontend assets)
# Cara pakai: docker compose run --rm node_builder
# =============================================================================
FROM node:20-alpine AS node_builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Nilai publik Reverb di-inject saat build (lihat catatan di stage assets)
ARG VITE_REVERB_APP_KEY=
ARG VITE_REVERB_HOST=
ARG VITE_REVERB_PORT=443
ARG VITE_REVERB_SCHEME=https
ENV VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME
# Output build ke ./public/build (di-mount dari host)
CMD ["npm", "run", "build"]
