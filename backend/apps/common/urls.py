from django.urls import path

from .views import AnalyticsReportView, AnalyticsVisitCreateView, ContactEnquiryCreateView, health

urlpatterns = [
    path("health/", health, name="health"),
    path("contact/enquiries/", ContactEnquiryCreateView.as_view(), name="contact-enquiry-create"),
    path("analytics/visits/", AnalyticsVisitCreateView.as_view(), name="analytics-visit-create"),
    path("analytics/report/", AnalyticsReportView.as_view(), name="analytics-report"),
]
