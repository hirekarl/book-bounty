#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install uv if not present
pip install uv

# Install dependencies directly from the manifest
# Using -r pyproject.toml bypasses the 'Multiple top-level packages' error
uv pip install --system -r pyproject.toml

# Django tasks
python manage.py migrate
python manage.py collectstatic --no-input