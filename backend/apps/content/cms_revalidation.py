"""Best-effort, signed notification to the Next.js cache endpoint.

Publishing is intentionally never blocked by an unavailable frontend. Production
can retry missed notifications from audit data or its job runner; the public
frontend also retains its normal cache lifetime as a fallback.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from urllib import request as urlrequest

from django.db import transaction


def queue_revalidation(*, tags: list[str], paths: list[str]) -> None:
    endpoint = os.getenv("CMS_REVALIDATE_URL", "").strip()
    secret = os.getenv("CMS_REVALIDATE_SECRET", "").strip()
    if not endpoint or not secret:
        return

    payload = json.dumps(
        {"tags": tags, "paths": paths, "timestamp": datetime.now(timezone.utc).isoformat()},
        separators=(",", ":"),
    ).encode()
    signature = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

    def send() -> None:
        try:
            req = urlrequest.Request(
                endpoint,
                data=payload,
                method="POST",
                headers={"Content-Type": "application/json", "X-CMS-Signature": signature},
            )
            with urlrequest.urlopen(req, timeout=5):
                pass
        except Exception:
            # The content is already live in Django. A deployment-level job can
            # retry if the frontend endpoint is temporarily unavailable.
            return

    transaction.on_commit(send)
