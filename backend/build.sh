#!/usr/bin/env bash
# Exit on error
set -o errexit

# Force uv to use the local environment
unset VIRTUAL_ENV

# Sync dependencies (psycopg[binary] must be in pyproject.toml)
uv sync --frozen

# 1. Run migrations
uv run python manage.py migrate

# 2. Collect static files
uv run python manage.py collectstatic --no-input

# 3. Create Superuser (Robust Check)
# This script only creates the user if the username doesn't already exist.
echo "from django.contrib.auth import get_user_model; \
User = get_user_model(); \
import os; \
username = os.getenv('DJANGO_SUPERUSER_USERNAME'); \
email = os.getenv('DJANGO_SUPERUSER_EMAIL'); \
password = os.getenv('DJANGO_SUPERUSER_PASSWORD'); \
User.objects.filter(username=username).exists() or \
User.objects.create_superuser(username, email, password)" \
| uv run python manage.py shell