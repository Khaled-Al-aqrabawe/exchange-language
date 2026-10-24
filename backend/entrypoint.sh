#!/bin/sh
set -e

python manage.py migrate --noinput

# Create the admin user from DJANGO_SUPERUSER_EMAIL / DJANGO_SUPERUSER_PASSWORD if set.
# Fails harmlessly when the variables are missing or the user already exists.
python manage.py createsuperuser --noinput || true

exec "$@"
