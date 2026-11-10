# ---------- Stage 1: Build React (Vite) ----------
FROM node:20-slim AS frontend-build
WORKDIR /app

# Build-time Vite variables (set the same names in Render's Environment tab)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package*.json ./
# Fall back to npm install if a Windows-made lockfile is missing Linux binaries
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build


# ---------- Stage 2: PHP + Apache ----------
FROM php:8.3-apache

RUN apt-get update \
 && apt-get install -y --no-install-recommends git unzip \
 && rm -rf /var/lib/apt/lists/* \
 && docker-php-ext-install pdo pdo_mysql \
 && a2enmod rewrite

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY backend/ /var/www/html/

RUN if [ -f composer.json ]; then composer install --no-dev --optimize-autoloader --no-interaction; fi \
 && if [ -f app/composer.json ]; then cd app && composer install --no-dev --optimize-autoloader --no-interaction; fi

# React build -> public/
COPY --from=frontend-build /app/dist/ /var/www/html/public/

RUN mkdir -p public/uploads/receipts public/uploads/chat public/uploads/prayers public/uploads/avatars runtime

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
 && sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

RUN chown -R www-data:www-data /var/www/html \
 && chmod -R 755 /var/www/html \
 && chmod -R 775 public/uploads runtime

EXPOSE 80