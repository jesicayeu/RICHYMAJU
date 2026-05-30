#!/bin/sh
set -e

php artisan storage:link --force || true
php artisan migrate --force
php artisan db:seed --force
php artisan optimize:clear
# Jangan config:cache — APP_KEY berakhiran "=" bisa rusak saat di-cache di Docker
php artisan route:cache
php artisan view:cache

chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rw storage bootstrap/cache

exec "$@"
