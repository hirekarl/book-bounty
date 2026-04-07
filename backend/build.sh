#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install uv using the system pip
pip install uv

# Install backend dependencies to the system environment
uv pip install --system .

# Run database migrations
python manage.py migrate

# Collect static files for WhiteNoise
python manage.py collectstatic --no-input