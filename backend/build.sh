#!/usr/bin/env bash
# Exit on error
set -o errexit

# Fix: Explicitly target the local .venv to silence the mismatch warning
export UV_PROJECT_ENVIRONMENT=.venv

# Sync dependencies (this will now include psycopg)
uv sync --frozen

# Run Django tasks
uv run python manage.py migrate
uv run python manage.py collectstatic --no-input