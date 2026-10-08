from apps.common.throttling import ScopedRateThrottle


class LoginAccountThrottle(ScopedRateThrottle):
    fixed_scope = "login_account"

    def get_identity(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        identifier = data.get("identifier") or data.get("email") or ""
        if not isinstance(identifier, str):
            return "invalid"
        # The common throttle hashes this value with a server secret; identifiers
        # are not written to logs or stored in clear text in rate-limit records.
        return identifier.strip().casefold()[:255]
