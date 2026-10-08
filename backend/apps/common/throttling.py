from datetime import datetime, timezone
from ipaddress import ip_address, ip_network

from django.conf import settings
from django.db import transaction
from django.utils.crypto import salted_hmac
from rest_framework.throttling import ScopedRateThrottle as DRFScopedRateThrottle


def client_address(request):
    """Only a known proxy may supply forwarding information; walk right to left."""
    peer = request.META.get("REMOTE_ADDR", "")
    trusted = [ip_network(value) for value in settings.TRUSTED_PROXY_CIDRS]

    def is_trusted(value):
        try:
            return any(ip_address(value) in network for network in trusted)
        except ValueError:
            return False

    if not is_trusted(peer):
        return peer
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if not forwarded or len(forwarded) > 2048:
        return peer
    hops = [value.strip() for value in forwarded.split(",")]
    try:
        for value in hops:
            ip_address(value)
    except ValueError:
        return peer
    for value in reversed(hops):
        if not is_trusted(peer):
            break
        peer = value
    return str(ip_address(peer))


class ScopedRateThrottle(DRFScopedRateThrottle):
    """Atomic PostgreSQL counters shared by all workers (not process-local cache)."""

    def allow_request(self, request, view):
        from .models import RateLimitBucket

        self.scope = getattr(view, self.scope_attr, None)
        if not self.scope:
            return True
        self.rate = self.get_rate()
        if not self.rate:
            return True
        self.num_requests, self.duration = self.parse_rate(self.rate)
        self.now = self.timer()
        key = salted_hmac("iod.rate-limit.v1", f"{self.scope}:{client_address(request)}", algorithm="sha256").hexdigest()
        expires = datetime.fromtimestamp(self.now + self.duration, tz=timezone.utc)
        with transaction.atomic():
            bucket, _ = RateLimitBucket.objects.select_for_update().get_or_create(
                key=key, defaults={"expires_at": expires},
            )
            self.history = [stamp for stamp in bucket.history if stamp > self.now - self.duration]
            if len(self.history) >= self.num_requests:
                return False
            self.history.insert(0, self.now)
            bucket.history = self.history
            bucket.expires_at = expires
            bucket.save(update_fields=["history", "expires_at"])
        return True
