from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.serializers import CharField, Serializer
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from .email import send_institutional_email
from .serializers import ContactEnquiryCreateSerializer, ContactEnquiryResponseSerializer


class HealthResponseSerializer(Serializer):
    status = CharField()
    service = CharField()
    version = CharField()


@extend_schema(responses=HealthResponseSerializer)
@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok", "service": "iod-gh-api", "version": "v1"})


@method_decorator(csrf_protect, name="dispatch")
class ContactEnquiryCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact_enquiry"

    @extend_schema(request=ContactEnquiryCreateSerializer, responses={201: ContactEnquiryResponseSerializer})
    def post(self, request):
        serializer = ContactEnquiryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enquiry = serializer.save()

        send_institutional_email(
            subject=f"New IoD-Gh website enquiry — {enquiry.enquiry_type}",
            recipient=settings.CONTACT_ENQUIRY_RECIPIENTS,
            recipient_name="IoD-Gh Team",
            heading="A new website enquiry has arrived.",
            introduction="A visitor has submitted an enquiry through the IoD-Gh website.",
            details=(
                ("Enquiry type", enquiry.enquiry_type),
                ("Name", enquiry.full_name),
                ("Email address", enquiry.email),
                ("Phone number", enquiry.phone_number or "Not provided"),
                ("Message", enquiry.message),
            ),
            closing="You can reply directly to this email to respond to the enquirer.",
            reply_to=(enquiry.email,),
        )
        send_institutional_email(
            subject="We received your IoD-Gh enquiry",
            recipient=enquiry.email,
            recipient_name=enquiry.full_name,
            heading="Thank you for contacting IoD-Gh.",
            introduction="We have received your enquiry and the appropriate IoD-Gh team will be in touch.",
            details=(("Enquiry type", enquiry.enquiry_type),),
            closing="Thank you for your interest in the Institute of Directors-Ghana.",
        )
        return Response(ContactEnquiryResponseSerializer(enquiry).data, status=status.HTTP_201_CREATED)
