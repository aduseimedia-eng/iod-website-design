from django.contrib import admin

from .models import MemberDirectoryEntry, MemberProfile, MembershipApplication, MembershipRenewal, MembershipStatusHistory, MembershipType


@admin.register(MemberDirectoryEntry)
class MemberDirectoryEntryAdmin(admin.ModelAdmin):
    list_display = ("full_name", "designation", "as_of_date", "is_published", "sort_order")
    list_filter = ("designation", "is_published", "as_of_date")
    search_fields = ("full_name",)
    list_editable = ("is_published", "sort_order")


@admin.register(MembershipType)
class MembershipTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "renewal_period_months")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")


@admin.register(MembershipApplication)
class MembershipApplicationAdmin(admin.ModelAdmin):
    list_display = ("reference", "first_name", "last_name", "recommending_agent", "application_kind", "assigned_type", "status", "submitted_at")
    list_filter = ("status", "application_kind", "assigned_type")
    search_fields = ("reference", "first_name", "last_name", "email", "recommending_agent")
    readonly_fields = ("reference", "tracking_token_hash", "submitted_at", "updated_at")


@admin.register(MemberProfile)
class MemberProfileAdmin(admin.ModelAdmin):
    list_display = ("membership_number", "first_name", "last_name", "membership_type", "status", "is_publicly_listed")
    list_filter = ("status", "membership_type", "is_publicly_listed")
    search_fields = ("membership_number", "first_name", "last_name", "email")
    readonly_fields = ("membership_number", "created_at", "updated_at")


@admin.register(MembershipRenewal)
class MembershipRenewalAdmin(admin.ModelAdmin):
    list_display = ("member", "period_start", "period_end", "amount", "currency", "status", "due_date")
    list_filter = ("status", "currency")
    search_fields = ("member__membership_number", "member__email")


@admin.register(MembershipStatusHistory)
class MembershipStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("member", "previous_status", "new_status", "changed_by", "created_at")
    list_filter = ("new_status",)
    search_fields = ("member__membership_number", "member__email")
    readonly_fields = ("member", "previous_status", "new_status", "changed_by", "reason", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
