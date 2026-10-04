from __future__ import annotations

from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.common.email import send_institutional_email


def user_token_data(user) -> dict[str, str]:
    return {"uid": urlsafe_base64_encode(force_bytes(user.pk)), "token": default_token_generator.make_token(user)}


def send_verification_email(user) -> None:
    token_data = user_token_data(user)
    url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/verify-email?{urlencode(token_data)}"
    send_institutional_email(
        subject="Verify your IoD-Gh account",
        recipient=user.email,
        recipient_name=user.full_name or "IoD-Gh member",
        heading="Verify your email address.",
        introduction="Thank you for creating an IoD-Gh account. Please verify your email address to activate sign-in.",
        closing="If you did not create this account, you can safely ignore this email.",
        action_label="Verify email address",
        action_url=url,
    )


def send_password_reset_email(user) -> None:
    token_data = user_token_data(user)
    url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password?{urlencode(token_data)}"
    send_institutional_email(
        subject="Reset your IoD-Gh password",
        recipient=user.email,
        recipient_name=user.full_name or "IoD-Gh member",
        heading="Reset your password.",
        introduction="We received a request to reset the password for your IoD-Gh account.",
        closing="If you did not request a password reset, you can safely ignore this email.",
        action_label="Reset password",
        action_url=url,
    )
