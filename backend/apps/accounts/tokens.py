from django.contrib.auth.tokens import PasswordResetTokenGenerator


class ResetTokenGenerator(PasswordResetTokenGenerator):
    # Deliberately invalidate links made with Django's old shared generator.
    key_salt = "iod.accounts.password-reset.v2"

    def _make_hash_value(self, user, timestamp):
        return super()._make_hash_value(user, timestamp) + str(user.is_active)


class VerificationTokenGenerator(ResetTokenGenerator):
    key_salt = "iod.accounts.email-verification.v2"

    def _make_hash_value(self, user, timestamp):
        return super()._make_hash_value(user, timestamp) + str(user.email_verified_at)


password_reset_token_generator = ResetTokenGenerator()
verification_token_generator = VerificationTokenGenerator()
