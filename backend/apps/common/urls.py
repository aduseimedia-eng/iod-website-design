from django.urls import path

from .views import ContactEnquiryCreateView, health

urlpatterns = [
    path("health/", health, name="health"),
    path("contact/enquiries/", ContactEnquiryCreateView.as_view(), name="contact-enquiry-create"),
]
