#!/usr/bin/env bash
# Exit on error
set -o errexit

# Render's Python runtime sets a VIRTUAL_ENV at the repo root.
# Unset it to force uv to use the .venv in this subdirectory.
unset VIRTUAL_ENV

# Sync dependencies using the backend/uv.lock file
uv sync --frozen

# Execute Django commands via uv run
uv run python manage.py migrate
uv run python manage.py collectstatic --no-input