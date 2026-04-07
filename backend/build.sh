#!/usr/bin/env bash
# Exit on error
set -o errexit

# No need to 'pip install uv'; Render already provides version 0.10.2
# Sync dependencies (this creates/updates a managed virtualenv)
uv sync

# Use 'uv run' to ensure we use the environment we just synced
uv run python manage.py migrate
uv run python manage.py collectstatic --no-input