from __future__ import annotations

from collections.abc import Iterable
from email.mime.image import MIMEImage
from mimetypes import guess_type
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def send_institutional_email(
    *,
    subject: str,
    recipient: str | Iterable[str],
    recipient_name: str,
    heading: str,
    introduction: str,
    details: Iterable[tuple[str, str]] = (),
    closing: str,
    action_label: str | None = None,
    action_url: str | None = None,
    attachments: Iterable[tuple[str, bytes]] = (),
    reply_to: Iterable[str] = (),
) -> None:
    """Send a consistently branded IoD-Gh email with a plain-text fallback and reply handling."""
    detail_rows = [{"label": label, "value": value} for label, value in details]
    logo_path = Path(settings.BASE_DIR).parent / "public" / "images" / "iod-logo-white.png"
    has_logo = logo_path.is_file()

    text_lines = [
        f"Dear {recipient_name},",
        "",
        introduction,
        "",
        *[f"{row['label']}: {row['value']}" for row in detail_rows],
        "",
        closing,
        "",
        "Institute of Directors-Ghana",
    ]
    if action_label and action_url:
        text_lines.extend(["", f"{action_label}: {action_url}"])

    context = {
        "recipient_name": recipient_name,
        "heading": heading,
        "introduction": introduction,
        "details": detail_rows,
        "closing": closing,
        "action_label": action_label,
        "action_url": action_url,
        "has_logo": has_logo,
    }
    recipients = [recipient] if isinstance(recipient, str) else list(recipient)
    message = EmailMultiAlternatives(
        subject=subject,
        body="\n".join(text_lines),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
        reply_to=list(reply_to),
    )
    message.attach_alternative(render_to_string("emails/institutional_email.html", context), "text/html")

    if has_logo:
        logo = MIMEImage(logo_path.read_bytes())
        logo.add_header("Content-ID", "<iod-gh-logo>")
        logo.add_header("Content-Disposition", "inline", filename=logo_path.name)
        message.attach(logo)

    for filename, content in attachments:
        mimetype, _ = guess_type(filename)
        message.attach(filename, content, mimetype or "application/octet-stream")

    message.send(fail_silently=False)
