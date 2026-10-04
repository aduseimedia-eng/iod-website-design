from rest_framework.permissions import BasePermission


class HasNamedRole(BasePermission):
    role_name = ""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_superuser or request.user.groups.filter(name=self.role_name).exists()))


class IsMembershipOfficer(HasNamedRole):
    role_name = "Membership Officer"


class IsTrainingOfficer(HasNamedRole):
    role_name = "Training Officer"


class IsFinanceOfficer(HasNamedRole):
    role_name = "Finance"


class IsContentManager(HasNamedRole):
    role_name = "Content Manager"


class IsContentEditor(BasePermission):
    def has_permission(self, request, view):
        from apps.content.cms_permissions import cms_access
        access = cms_access(request.user)
        return access['manage'] or (access['read_only'] and request.method in ('GET', 'HEAD', 'OPTIONS'))


class IsDirectoryManager(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_superuser or request.user.is_staff or request.user.groups.filter(name="Membership Officer").exists()))
