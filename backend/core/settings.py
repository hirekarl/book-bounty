import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Security & Environment ---
_secret_key = os.getenv("SECRET_KEY")
if not _secret_key:
    raise ImproperlyConfigured(
        "The SECRET_KEY environment variable is not set. "
        "Set it in your .env file or shell environment before starting Django."
    )
SECRET_KEY = _secret_key

DEBUG = os.getenv("DEBUG", "True").lower() == "true"

ALLOWED_HOSTS: list[str] = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# --- Application definition ---
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party apps
    "rest_framework",
    "rest_framework.authtoken",
    "dj_rest_auth",
    "corsheaders",
    "whitenoise.runserver_nostatic",  # Optional: helps WhiteNoise in development
    # Local apps
    "triage",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # MUST be after SecurityMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# --- Database Configuration ---
# Uses dj-database-url to automatically parse Render's DATABASE_URL string.
# Defaults to local SQLite if no environment variable is found.
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# --- Static & Media Files ---
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Enable WhiteNoise's compression and caching support
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# --- CORS & REST Framework ---
CORS_ALLOWED_ORIGINS: list[str] = os.getenv(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173"
).split(",")

if not DEBUG and CORS_ALLOWED_ORIGINS == ["http://localhost:5173"]:
    raise ImproperlyConfigured(
        "CORS_ALLOWED_ORIGINS is still set to default in a non-DEBUG environment."
    )

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

# --- External API Keys & Config ---
OPEN_LIBRARY_CONTACT: str = os.getenv("OPEN_LIBRARY_CONTACT", "anonymous@example.com")
EBAY_CLIENT_ID: str = os.getenv("EBAY_CLIENT_ID", "")
EBAY_CLIENT_SECRET: str = os.getenv("EBAY_CLIENT_SECRET", "")

ROOT_URLCONF = "core.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/New_York"
USE_I18N = True
USE_TZ = True
