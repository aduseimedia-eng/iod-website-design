from django.core.management.base import BaseCommand
import time
from django.db import transaction
from django.utils import timezone
from apps.examinations.models import ExamAttempt
from apps.examinations.services import synchronize


class Command(BaseCommand):
    help = "Expire attempts and release scheduled results. Run every minute. Safe to run concurrently."

    def add_arguments(self, parser):
        parser.add_argument("--watch", action="store_true", help="Run continuously as a supervised worker.")

    def handle(self, *args, **kwargs):
        while True:
            self.process()
            if not kwargs["watch"]:
                return
            time.sleep(30)

    def process(self):
        candidates = ExamAttempt.objects.filter(status="IN_PROGRESS", expires_at__lte=timezone.now()) | ExamAttempt.objects.filter(status__in=["SUBMITTED", "EXPIRED"], result__released_at__isnull=True, exam_version__configuration__result_release="SCHEDULED")
        count = 0
        for pk in candidates.values_list("pk", flat=True).iterator():
            with transaction.atomic():
                attempt = ExamAttempt.objects.select_for_update(of=("self",)).select_related("exam", "exam_version", "student").get(pk=pk)
                synchronize(attempt)
                count += 1
        self.stdout.write(f"Processed {count} examination attempts.")
