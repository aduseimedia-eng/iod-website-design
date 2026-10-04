from __future__ import annotations

from .models import AuditLog


def record_event(*, action: str, target_type: str, target_id=None, actor=None, request=None, metadata: dict | None = None) -> AuditLog:
    return AuditLog.objects.create(actor=actor if getattr(actor, "is_authenticated", False) else None, action=action, target_type=target_type, target_id=target_id, request_id=getattr(request, "request_id", ""), metadata=metadata or {})
