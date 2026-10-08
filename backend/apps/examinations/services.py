import logging
import secrets
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.audit.services import record_event
from apps.common.email import send_institutional_email
from .models import Exam, ExamVersion, Question, QuestionOption, ExamQuestion, ExamAttempt, ExamAnswer, ExamEligibility, ExamResult, ExamAuditLog


def audit(event, *, user=None, exam=None, attempt=None, request=None, metadata=None):
    entry = ExamAuditLog.objects.create(event=event, actor=user, exam=exam or (attempt.exam if attempt else None), attempt=attempt, metadata=metadata or {})
    record_event(action=f"examination.{event.lower()}", target_type="exam_attempt" if attempt else "exam", target_id=attempt.pk if attempt else exam.pk if exam else None, actor=user, request=request, metadata=metadata)
    return entry


def notify(user, event, title):
    """Reuse the platform's institutional delivery, never put scores in email."""
    if not settings.EXAM_EMAIL_NOTIFICATIONS:
        return
    def deliver():
        send_institutional_email(subject="IoD-Gh examination update", recipient=user.email, recipient_name=user.full_name or "Candidate", heading="Examination update", introduction=f"{title}: {event.replace('_', ' ').lower()}.", closing="Sign in securely to the Examination Portal for details.", action_label="Open Examination Portal", action_url=settings.EXAM_PORTAL_URL)
    transaction.on_commit(deliver, robust=True)


@transaction.atomic
def save_question(data, user, request, previous=None):
    options = data.pop("options")
    if previous:
        # Lock the first revision of the lineage, so editing different revisions
        # concurrently cannot allocate the same next version number.
        Question.objects.select_for_update().get(lineage=previous.lineage, version=1)
        version = Question.objects.filter(lineage=previous.lineage).order_by("-version").first().version + 1
        data.update(lineage=previous.lineage, version=version)
    question = Question.objects.create(**data, created_by=user)
    QuestionOption.objects.bulk_create([QuestionOption(question=question, position=i, **option) for i, option in enumerate(options)])
    audit("QUESTION_VERSION_CREATED", user=user, request=request, metadata={"question": str(question.id), "version": question.version})
    return question


def question_snapshot(question):
    return {"text": question.text, "question_type": question.question_type, "marks": str(question.marks), "options": [{"id": str(option.id), "text": option.text, "is_correct": option.is_correct} for option in question.options.all()]}


@transaction.atomic
def save_exam(data, user, request, exam_id=None):
    questions = {q.id: q for q in Question.objects.filter(id__in=data["question_ids"], is_active=True).prefetch_related("options")}
    if len(questions) != len(data["question_ids"]):
        raise ValidationError("All selected questions must exist and be active.")
    snapshots = [question_snapshot(questions[pk]) for pk in data["question_ids"]]
    if any(len(s["options"]) < 2 or sum(o["is_correct"] for o in s["options"]) != 1 for s in snapshots):
        raise ValidationError("Every selected question needs valid options and one correct answer.")
    exam = Exam.objects.select_for_update().get(pk=exam_id) if exam_id else Exam.objects.create(title=data["title"])
    configuration = {key: (value.isoformat() if hasattr(value, "isoformat") else str(value) if isinstance(value, Decimal) else value) for key, value in data.items() if key not in ["is_active", "question_ids"]}
    version = ExamVersion.objects.create(exam=exam, number=(exam.current_version.number + 1 if exam.current_version_id else 1), configuration=configuration, created_by=user)
    ExamQuestion.objects.bulk_create([ExamQuestion(version=version, question=questions[pk], position=i, snapshot=snapshots[i]) for i, pk in enumerate(data["question_ids"])])
    exam.title, exam.is_active, exam.current_version = data["title"], data["is_active"], version
    exam.save(update_fields=["title", "is_active", "current_version"])
    audit("EXAM_VERSION_CREATED", user=user, exam=exam, request=request, metadata={"version": version.number})
    return exam


def available(exam, user, now=None):
    now = now or timezone.now()
    if not exam.is_active or not exam.current_version_id:
        return False
    config = exam.current_version.configuration
    return (parse_datetime(config["starts_at"]) <= now < parse_datetime(config["ends_at"])
            and ExamEligibility.objects.filter(exam=exam, student=user, is_active=True).exists()
            and ExamAttempt.objects.filter(exam=exam, student=user).count() < config["maximum_attempts"])


@transaction.atomic
def start_attempt(exam_id, user, request):
    User.objects.select_for_update().get(pk=user.pk)
    exam = Exam.objects.select_for_update(of=("self",)).select_related("current_version").filter(pk=exam_id).first()
    if not exam:
        return None
    active = ExamAttempt.objects.select_for_update().filter(exam=exam, student=user, status="IN_PROGRESS").first()
    now = timezone.now()
    if active:
        if active.expires_at > now:
            return active
        finalize(active, "EXPIRED", request=request)
    if not available(exam, user, now):
        return None
    config = exam.current_version.configuration
    questions = list(exam.current_version.questions.all())
    rng = secrets.SystemRandom()
    if config["select_from_bank"]:
        questions = rng.sample(questions, config["question_count"])
    if config["randomize_questions"]:
        rng.shuffle(questions)
    option_order = {}
    for question in questions:
        options = [option["id"] for option in question.snapshot["options"]]
        if config["randomize_options"]:
            rng.shuffle(options)
        option_order[str(question.id)] = options
    attempt = ExamAttempt.objects.create(student=user, exam=exam, exam_version=exam.current_version, attempt_number=ExamAttempt.objects.filter(exam=exam, student=user).count() + 1, started_at=now, expires_at=min(now + timedelta(minutes=config["duration_minutes"]), parse_datetime(config["ends_at"])), question_order=[str(q.id) for q in questions], option_order=option_order)
    audit("EXAM_STARTED", user=user, attempt=attempt, request=request)
    notify(user, "EXAM_STARTED", config["title"])
    return attempt


def release_result(result, *, user=None, request=None):
    if result.released_at:
        return
    result.released_at, result.released_by = timezone.now(), user
    result.save(update_fields=["released_at", "released_by"])
    audit("RESULT_RELEASED", user=user, attempt=result.attempt, request=request)
    audit("EXAM_PASSED" if result.passed else "EXAM_FAILED", attempt=result.attempt)
    notify(result.attempt.student, "EXAM_RESULT_RELEASED", result.attempt.exam_version.configuration["title"])


def finalize(attempt, status, *, request=None):
    """Caller must hold the attempt row lock in a transaction."""
    if attempt.status != "IN_PROGRESS":
        return
    questions = list(attempt.exam_version.questions.filter(id__in=attempt.question_order))
    answers = {str(answer.question_id): str(answer.selected_option) for answer in attempt.answers.all()}
    total, score = Decimal(0), Decimal(0)
    for question in questions:
        marks = Decimal(question.snapshot["marks"])
        total += marks
        if any(option["is_correct"] and option["id"] == answers.get(str(question.id)) for option in question.snapshot["options"]):
            score += marks
    percentage = (score / total * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    config = attempt.exam_version.configuration
    result = ExamResult.objects.create(attempt=attempt, score=score, total_marks=total, percentage=percentage, grade=next((grade for minimum, grade in [(80, "A"), (70, "B"), (60, "C"), (50, "D")] if percentage >= minimum), "F"), passed=percentage >= Decimal(config["pass_mark"]))
    attempt.status, attempt.submitted_at = status, timezone.now()
    attempt.save(update_fields=["status", "submitted_at"])
    audit("EXAM_AUTO_EXPIRED" if status == "EXPIRED" else "EXAM_SUBMITTED", user=attempt.student, attempt=attempt, request=request)
    notify(attempt.student, "EXAM_SUBMITTED", config["title"])
    if config["result_release"] == "IMMEDIATE" or (config["result_release"] == "SCHEDULED" and parse_datetime(config["release_at"]) <= timezone.now()):
        release_result(result, request=request)


def synchronize(attempt, request=None):
    if attempt.status == "IN_PROGRESS" and timezone.now() >= attempt.expires_at:
        finalize(attempt, "EXPIRED", request=request)
    if attempt.status in ["SUBMITTED", "EXPIRED"]:
        result = attempt.result
        config = attempt.exam_version.configuration
        if not result.released_at and config["result_release"] == "SCHEDULED" and parse_datetime(config["release_at"]) <= timezone.now():
            release_result(result, request=request)


def public_attempt(attempt):
    config = attempt.exam_version.configuration
    return {"id": str(attempt.id), "exam_id": str(attempt.exam_id), "title": config["title"], "instructions": config["instructions"], "status": attempt.status, "started_at": attempt.started_at, "expires_at": attempt.expires_at, "server_time": timezone.now(), "question_count": len(attempt.question_order)}


def public_questions(attempt):
    # Explicit allowlist. Neither snapshots nor model serializers leave this layer.
    questions = {str(q.id): q for q in attempt.exam_version.questions.filter(id__in=attempt.question_order)}
    answers = {str(a.question_id): a for a in attempt.answers.all()}
    result = []
    for pk in attempt.question_order:
        question = questions[pk]
        options = {option["id"]: option for option in question.snapshot["options"]}
        answer = answers.get(pk)
        result.append({"id": pk, "text": question.snapshot["text"], "marks": question.snapshot["marks"], "options": [{"id": key, "text": options[key]["text"]} for key in attempt.option_order[pk]], "selected_option": str(answer.selected_option) if answer else None, "answer_revision": answer.revision if answer else 0})
    return result
