FROM node:22-alpine AS assets

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY resources resources
COPY public public
COPY vite.config.* tsconfig.json postcss.config.* tailwind.config.* ./
RUN npm run build

FROM php:8.4-apache

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libicu-dev \
        libonig-dev \
        libsqlite3-dev \
        libzip-dev \
    && docker-php-ext-install \
        bcmath \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        pdo_sqlite \
        zip \
    && a2enmod rewrite headers \
    && sed -ri -e "s!/var/www/html!${APACHE_DOCUMENT_ROOT}!g" \
        /etc/apache2/sites-available/*.conf \
        /etc/apache2/apache2.conf \
        /etc/apache2/conf-available/*.conf \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .
COPY --from=assets /app/public/build public/build
COPY docker/entrypoint.sh /usr/local/bin/richy-entrypoint

RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist \
    && chmod +x /usr/local/bin/richy-entrypoint \
    && chown -R www-data:www-data storage bootstrap/cache database \
    && chmod -R ug+rw storage bootstrap/cache database \
    && php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear

EXPOSE 80

ENTRYPOINT ["richy-entrypoint"]
CMD ["apache2-foreground"]
