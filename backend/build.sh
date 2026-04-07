#!/usr/bin/env bash
# Exit on error
set -o errexit

# Sync dependencies and ensure the .venv is clean
uv sync --frozen

# Use 'uv run' to execute commands within the synced environment
uv run python manage.py migrate
uv run python manage.py collectstatic --no-input