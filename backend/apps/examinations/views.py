import csv
import io

from django.db import transaction
from django.db.models import OuterRef, Subquery
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.common.throttling import ScopedRateThrottle
from apps.membership.models import MemberProfile
from .models import Exam, Question, ExamAttempt, ExamAnswer, ExamEligibility, ExamResult, ExamAuditLog
from .serializers import ExamInput, QuestionInput, AnswerInput, AssignmentInput, QuestionViewedInput, AttemptFilters, ExportFilters
from .services import audit, available, start_attempt, save_question, save_exam, public_attempt, public_questions, synchronize, finalize, release_result, notify


class VerifiedAccount(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_active and bool(request.user.email_verified_at)


class ExamManager(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_active and request.user.email_verified_at and (request.user.is_superuser or (request.user.is_staff and request.user.groups.filter(name="Training Officer").exists())))


class ExamThrottle(ScopedRateThrottle):
    def get_identity(self, request):
        return f"exam-user:{request.user.pk}"


class PrivateView(APIView):
    permission_classes = [VerifiedAccount]
    throttle_classes = [ExamThrottle]
    throttle_scope = "exam_read"

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store, private"
        response["Vary"] = "Cookie, Origin"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class StaffView(PrivateView):
    permission_classes = [ExamManager]
    throttle_scope = "exam_admin"


def validated(serializer_class, request):
    serializer = serializer_class(data=request.data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def page_response(request, queryset, renderer):
    paginator = PageNumberPagination()
    paginator.page_size = 50
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response([renderer(item) for item in page])


class AvailableExams(PrivateView):
    def get(self, request):
        exams = Exam.objects.filter(eligibilities__student=request.user, eligibilities__is_active=True).select_related("current_version").order_by("title")
        # Include resumable attempts and past results even if a later version is
        # inactive or eligibility has since been revoked. Ownership still applies.
        attempts = ExamAttempt.objects.filter(student=request.user).select_related("exam_version", "exam").order_by("-started_at")
        data = []
        for exam in exams:
            if available(exam, request.user):
                config = exam.current_version.configuration
                data.append({"id": str(exam.id), "title": config["title"], "instructions": config["instructions"], "duration_minutes": config["duration_minutes"], "question_count": config["question_count"]})
        return Response({"exams": data, "attempts": [public_attempt(attempt) for attempt in attempts[:100]]})


class StartExam(PrivateView):
    throttle_scope = "exam_start"

    def post(self, request, exam_id):
        attempt = start_attempt(exam_id, request.user, request)
        if not attempt:
            return Response({"detail": "This examination is currently unavailable to your account."}, status=403)
        return Response(public_attempt(attempt))


def owned_attempt(request, pk):
    return get_object_or_404(ExamAttempt.objects.select_for_update(of=("self",)).select_related("exam_version", "exam", "student"), pk=pk, student=request.user)


class AttemptDetail(PrivateView):
    @transaction.atomic
    def get(self, request, attempt_id):
        attempt = owned_attempt(request, attempt_id)
        synchronize(attempt, request)
        return Response(public_attempt(attempt))


class AttemptQuestions(PrivateView):
    @transaction.atomic
    def get(self, request, attempt_id):
        attempt = owned_attempt(request, attempt_id)
        synchronize(attempt, request)
        if attempt.status != "IN_PROGRESS":
            return Response({"detail": "This attempt is closed."}, status=409)
        return Response({"attempt": public_attempt(attempt), "questions": public_questions(attempt)})


class SaveAnswer(PrivateView):
    throttle_scope = "exam_write"

    @transaction.atomic
    def post(self, request, attempt_id):
        attempt = owned_attempt(request, attempt_id)
        synchronize(attempt, request)
        if attempt.status != "IN_PROGRESS":
            return Response({"detail": "This attempt is closed. No answers were changed."}, status=409)
        data = validated(AnswerInput, request)
        pk, option = str(data["question_id"]), str(data["option_id"])
        if pk not in attempt.question_order or option not in attempt.option_order.get(pk, []):
            raise ValidationError("The question or option does not belong to this attempt.")
        answer = ExamAnswer.objects.filter(attempt=attempt, question_id=pk).first()
        if data["base_revision"] != (answer.revision if answer else 0):
            # Idempotent network retry is harmless; a stale different answer must
            # not overwrite a more recent choice from another tab or device.
            if answer and str(answer.selected_option) == option:
                return Response({"saved": True, "revision": answer.revision})
            return Response({"detail": "This answer changed elsewhere. Reload the attempt before continuing."}, status=409)
        if answer:
            answer.selected_option, answer.revision = option, answer.revision + 1
            answer.save(update_fields=["selected_option", "revision", "updated_at"])
        else:
            answer = ExamAnswer.objects.create(attempt=attempt, question_id=pk, selected_option=option)
        audit("ANSWER_CHANGED" if answer.revision > 1 else "ANSWER_SAVED", user=request.user, attempt=attempt, request=request, metadata={"question": pk})
        return Response({"saved": True, "revision": answer.revision, "server_time": timezone.now()})


class QuestionViewed(PrivateView):
    throttle_scope = "exam_write"

    @transaction.atomic
    def post(self, request, attempt_id):
        attempt = owned_attempt(request, attempt_id)
        synchronize(attempt, request)
        data = validated(QuestionViewedInput, request)
        if attempt.status != "IN_PROGRESS" or str(data["question_id"]) not in attempt.question_order:
            return Response({"detail": "This question is unavailable."}, status=409)
        audit("QUESTION_VIEWED", user=request.user, attempt=attempt, request=request, metadata={"question": str(data["question_id"]), "source": "browser_reported"})
        return Response(status=204)


class SubmitAttempt(PrivateView):
    throttle_scope = "exam_write"

    @transaction.atomic
    def post(self, request, attempt_id):
        attempt = owned_attempt(request, attempt_id)
        synchronize(attempt, request)
        if attempt.status == "EXPIRED":
            return Response({"detail": "Time has expired. Only answers saved before the deadline were graded."}, status=409)
        if attempt.status == "CANCELLED":
            return Response({"detail": "This attempt is closed."}, status=409)
        if attempt.status == "IN_PROGRESS":
            finalize(attempt, "SUBMITTED", request=request)
        # Repeated submissions return the same immutable record, never regrade.
        return Response(public_attempt(attempt))


def result_data(attempt, staff=False):
    try:
        result = attempt.result
    except ExamResult.DoesNotExist:
        result = None
    data = {"attempt": public_attempt(attempt), "released": bool(result and result.released_at)}
    if result and (staff or result.released_at):
        data.update(score=str(result.score), total_marks=str(result.total_marks), percentage=str(result.percentage), grade=result.grade, passed=result.passed, released_at=result.released_at)
    return data


class AttemptResult(PrivateView):
    @transaction.atomic
    def get(self, request, attempt_id):
        attempt = owned_attempt(request, attempt_id)
        synchronize(attempt, request)
        return Response(result_data(attempt))


def staff_question(question):
    return {"id": str(question.id), "lineage": str(question.lineage), "version": question.version, "text": question.text, "question_type": question.question_type, "marks": str(question.marks), "explanation": question.explanation, "category": question.category, "difficulty": question.difficulty, "is_active": question.is_active, "options": [{"text": o.text, "is_correct": o.is_correct} for o in question.options.all()]}


class StaffQuestions(StaffView):
    def get(self, request):
        latest = Question.objects.filter(lineage=OuterRef("lineage")).order_by("-version").values("id")[:1]
        questions = Question.objects.filter(id=Subquery(latest)).prefetch_related("options").order_by("-created_at")
        if request.query_params.get("search"):
            questions = questions.filter(text__icontains=request.query_params["search"][:150])
        if request.query_params.get("category"):
            questions = questions.filter(category__iexact=request.query_params["category"][:150])
        audit("QUESTION_BANK_VIEWED", user=request.user, request=request)
        return page_response(request, questions, staff_question)

    def post(self, request):
        question = save_question(validated(QuestionInput, request), request.user, request)
        return Response(staff_question(question), status=201)


class StaffQuestionDetail(StaffView):
    def put(self, request, question_id):
        previous = get_object_or_404(Question, pk=question_id)
        question = save_question(validated(QuestionInput, request), request.user, request, previous)
        return Response(staff_question(question), status=201)


def staff_exam(exam):
    config = exam.current_version.configuration if exam.current_version_id else {}
    return {**config, "id": str(exam.id), "is_active": exam.is_active, "version": exam.current_version.number if exam.current_version_id else 0, "question_ids": [str(q.question_id) for q in exam.current_version.questions.all()] if exam.current_version_id else []}


class StaffExams(StaffView):
    def get(self, request):
        return page_response(request, Exam.objects.select_related("current_version").prefetch_related("current_version__questions").order_by("-created_at"), staff_exam)

    def post(self, request):
        return Response(staff_exam(save_exam(validated(ExamInput, request), request.user, request)), status=201)


class StaffExamDetail(StaffView):
    def put(self, request, exam_id):
        get_object_or_404(Exam, pk=exam_id)
        return Response(staff_exam(save_exam(validated(ExamInput, request), request.user, request, exam_id)))


class StaffEligibility(StaffView):
    def get(self, request, exam_id):
        exam = get_object_or_404(Exam, pk=exam_id)
        return page_response(request, ExamEligibility.objects.filter(exam=exam).select_related("student").order_by("student__email"), lambda grant: {"identifier": grant.student.email, "name": grant.student.full_name, "is_active": grant.is_active})

    @transaction.atomic
    def post(self, request, exam_id):
        exam = get_object_or_404(Exam, pk=exam_id)
        data = validated(AssignmentInput, request)
        user = User.objects.filter(email__iexact=data["identifier"], is_active=True).first()
        if not user:
            member = MemberProfile.objects.filter(membership_number__iexact=data["identifier"]).select_related("user").first()
            user = member.user if member else None
        if not user or not user.is_active:
            raise ValidationError("No active IoD account matches that email or membership number.")
        grant, created = ExamEligibility.objects.update_or_create(exam=exam, student=user, defaults={"assigned_by": request.user, "is_active": data["is_active"]})
        audit("ELIGIBILITY_ASSIGNED" if grant.is_active else "ELIGIBILITY_REVOKED", user=request.user, exam=exam, request=request, metadata={"student": str(user.pk)})
        if grant.is_active:
            notify(user, "EXAM_AVAILABLE", exam.title)
        return Response({"identifier": user.email, "is_active": grant.is_active}, status=201 if created else 200)


class StaffAttempts(StaffView):
    def get(self, request):
        filters = AttemptFilters(data=request.query_params)
        filters.is_valid(raise_exception=True)
        attempts = ExamAttempt.objects.select_related("exam_version", "exam", "student", "result").order_by("-started_at")
        if "exam" in filters.validated_data:
            attempts = attempts.filter(exam_id=filters.validated_data["exam"])
        if "status" in filters.validated_data:
            attempts = attempts.filter(status=filters.validated_data["status"])
        audit("RESULTS_VIEWED", user=request.user, request=request)
        return page_response(request, attempts, lambda attempt: {**result_data(attempt, staff=True), "student_email": attempt.student.email, "attempt_number": attempt.attempt_number, "submitted_at": attempt.submitted_at})


class StaffAttemptReview(StaffView):
    @transaction.atomic
    def get(self, request, attempt_id):
        attempt = get_object_or_404(ExamAttempt.objects.select_for_update(of=("self",)).select_related("exam_version", "exam", "student"), pk=attempt_id)
        synchronize(attempt, request)
        audit("ATTEMPT_REVIEWED", user=request.user, attempt=attempt, request=request)
        questions = public_questions(attempt)
        if attempt.status in ["SUBMITTED", "EXPIRED"]:
            keys = {str(q.pk): next(o["id"] for o in q.snapshot["options"] if o["is_correct"]) for q in attempt.exam_version.questions.filter(pk__in=attempt.question_order)}
            for question in questions:
                question["correct_option"] = keys[question["id"]]
        events = list(attempt.examauditlog_set.order_by("timestamp").values("event", "timestamp", "metadata")[:1000])
        return Response({**result_data(attempt, staff=True), "student_email": attempt.student.email, "questions": questions, "events": events})


class StaffRelease(StaffView):
    @transaction.atomic
    def post(self, request, attempt_id):
        attempt = get_object_or_404(ExamAttempt.objects.select_for_update(of=("self",)).select_related("exam_version", "exam", "student"), pk=attempt_id)
        synchronize(attempt, request)
        result = get_object_or_404(ExamResult, attempt=attempt)
        release_result(result, user=request.user, request=request)
        return Response(result_data(attempt, staff=True))


class StaffExport(StaffView):
    def get(self, request):
        filters = ExportFilters(data=request.query_params)
        filters.is_valid(raise_exception=True)
        exam = get_object_or_404(Exam, pk=filters.validated_data["exam"])
        rows = io.StringIO()
        writer = csv.writer(rows)
        writer.writerow(["Examination", "Student email", "Attempt", "Status", "Score", "Total", "Percentage", "Grade", "Passed", "Released at"])
        for result in ExamResult.objects.filter(attempt__exam=exam).select_related("attempt__student", "attempt__exam_version").iterator():
            values = [result.attempt.exam_version.configuration["title"], result.attempt.student.email, result.attempt.attempt_number, result.attempt.status, result.score, result.total_marks, result.percentage, result.grade, result.passed, result.released_at or ""]
            writer.writerow(["'" + str(value) if str(value).lstrip().startswith(("=", "+", "-", "@")) else value for value in values])
        audit("RESULTS_EXPORTED", user=request.user, exam=exam, request=request)
        response = HttpResponse(rows.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="exam-results.csv"'
        return response
