from django.urls import path

from . import views

urlpatterns = [
    path("pages/<slug:slug>/", views.PublicContentPageView.as_view()),
    path("items/", views.PublicContentItemListView.as_view(), name="content-items"),
    path("staff/pages/", views.StaffContentPageListView.as_view()),
    path("staff/pages/<uuid:pk>/", views.StaffContentPageDetailView.as_view()),
    path("staff/items/", views.StaffContentItemListView.as_view(), name="staff-content-items"),
    path("staff/items/<uuid:pk>/", views.StaffContentItemDetailView.as_view(), name="staff-content-item-detail"),
]
