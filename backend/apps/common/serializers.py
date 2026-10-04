from rest_framework import serializers

from .models import ContactEnquiry


class ContactEnquiryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactEnquiry
        fields = ("first_name", "last_name", "email", "phone_number", "enquiry_type", "message")

    def validate_enquiry_type(self, value: str) -> str:
        permitted = {"Membership", "Training", "Governance services", "General enquiry", "Other"}
        if value not in permitted:
            raise serializers.ValidationError("Choose a valid enquiry type.")
        return value


class ContactEnquiryResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactEnquiry
        fields = ("id", "status", "created_at")
        read_only_fields = fields
