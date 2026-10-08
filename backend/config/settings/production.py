import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

if len(SECRET_KEY) < 50 or SECRET_KEY.startswith("django-insecure-"):  # noqa: F405
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be a strong generated key of at least 50 characters in production.")
if not os.getenv("DATABASE_URL"):
    raise ImproperlyConfigured("DATABASE_URL must be configured in production.")
if DEFAULT_FROM_EMAIL == "noreply@example.invalid":  # noqa: F405
    raise ImproperlyConfigured("DEFAULT_FROM_EMAIL must be configured in production.")
if EMAIL_BACKEND.endswith(("console.EmailBackend", "locmem.EmailBackend", "dummy.EmailBackend")):  # noqa: F405
    raise ImproperlyConfigured("A production email backend must be configured.")
if EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend" and not EMAIL_HOST:  # noqa: F405
    raise ImproperlyConfigured("EMAIL_HOST must be configured for the SMTP email backend.")

DEBUG = False
UPLOAD_SCAN_REQUIRED = True
if not CLAMAV_HOST:  # noqa: F405
    raise ImproperlyConfigured("CLAMAV_HOST must be configured for production upload scanning.")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31_536_000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
