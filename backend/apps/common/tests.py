from django.core import mail
from django.test import Client, TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient, APIRequestFactory

from .api import exception_handler
from .models import ContactEnquiry


class HealthEndpointTests(TestCase):
    def test_health_endpoint_returns_minimal_service_status(self):
        response = APIClient().get("/api/v1/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "iod-gh-api", "version": "v1"})
        self.assertIn("X-Request-ID", response)

    def test_openapi_schema_is_available(self):
        response = APIClient().get("/api/schema/")

        self.assertEqual(response.status_code, 200)


class ApiErrorFormatTests(TestCase):
    def test_validation_errors_use_the_standard_envelope(self):
        request = APIRequestFactory().post("/api/v1/example/")
        response = exception_handler(ValidationError({"email": ["Enter a valid email address."]}), {"request": request, "view": None})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"]["code"], "invalid")
        self.assertIn("email", response.data["error"]["details"])


class ContactEnquiryTests(TestCase):
    def test_contact_enquiry_is_stored_and_sends_staff_and_sender_emails(self):
        client = Client(enforce_csrf_checks=True)
        client.get("/api/v1/auth/csrf/")
        response = client.post(
            "/api/v1/contact/enquiries/",
            data={
                "first_name": "Ama",
                "last_name": "Boateng",
                "email": "ama@example.com",
                "phone_number": "+233 20 123 4567",
                "enquiry_type": "Training",
                "message": "Please share the next director training dates.",
            },
            content_type="application/json",
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ContactEnquiry.objects.count(), 1)
        self.assertEqual(ContactEnquiry.objects.get().status, ContactEnquiry.Status.NEW)
        self.assertEqual(ContactEnquiry.objects.get().phone_number, "+233 20 123 4567")
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[0].subject, "New IoD-Gh website enquiry — Training")
        self.assertEqual(mail.outbox[0].reply_to, ["ama@example.com"])
        self.assertEqual(mail.outbox[1].subject, "We received your IoD-Gh enquiry")
