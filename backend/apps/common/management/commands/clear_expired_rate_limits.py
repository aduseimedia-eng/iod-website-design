from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.common.models import RateLimitBucket


class Command(BaseCommand):
    help = "Delete expired rate-limit buckets. Schedule daily in production."

    def handle(self, *args, **options):
        count, _ = RateLimitBucket.objects.filter(expires_at__lt=timezone.now()).delete()
        self.stdout.write(f"Removed {count} expired rate-limit buckets.")
