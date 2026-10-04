from rest_framework.permissions import BasePermission


def cms_access(user):
    # Every authenticated admin can manage content, irrespective of named roles.
    full = bool(user.is_authenticated and (user.is_superuser or user.is_staff))
    return {'manage': full, 'areas': [], 'read_only': False}


class CMSPermission(BasePermission):
    message = 'Sign in with an admin account to manage website content.'

    def has_permission(self, request, view):
        return cms_access(request.user)['manage']
