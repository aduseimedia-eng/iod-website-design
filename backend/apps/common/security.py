from django.http import JsonResponse


def csrf_failure(request, reason=""):
    return JsonResponse({"error": {"code": "csrf_failed", "message": "Request security validation failed."}}, status=403)
