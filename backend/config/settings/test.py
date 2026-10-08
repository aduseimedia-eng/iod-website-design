from .base import *  # noqa: F403

SECRET_KEY = "test-only-secret-key"  # noqa: F405
DEBUG = False
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
ADMIN_ENABLED = False
CLAMAV_HOST = ""
UPLOAD_SCAN_REQUIRED = False
