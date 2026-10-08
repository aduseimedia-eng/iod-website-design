from django.contrib.auth.tokens import default_token_generator
from django.test import TestCase
from rest_framework.test import APIClient

from .models import User
from .services import user_token_data
from .tokens import password_reset_token_generator, verification_token_generator


class PurposeBoundTokenTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("token-test@example.com", "Original-safe-pass-123!")
        self.client = APIClient()
        self.verify_url = "/api/v1/auth/email-verification/confirm/"
        self.reset_url = "/api/v1/auth/password-reset/confirm/"

    def test_verification_link_cannot_reset_password_before_or_after_verification(self):
        data = user_token_data(self.user, purpose="verification")
        reset = {**data, "password": "Another-safe-pass-123!"}
        self.assertEqual(self.client.post(self.reset_url, reset).status_code, 400)
        self.assertEqual(self.client.post(self.verify_url, data).status_code, 200)
        self.assertEqual(self.client.post(self.reset_url, reset).status_code, 400)
        self.assertEqual(self.client.post(self.verify_url, data).status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Original-safe-pass-123!"))

    def test_reset_link_cannot_verify_email_and_is_consumed_on_reset(self):
        data = user_token_data(self.user, purpose="password_reset")
        self.assertEqual(self.client.post(self.verify_url, data).status_code, 400)
        reset = {**data, "password": "Another-safe-pass-123!"}
        self.assertEqual(self.client.post(self.reset_url, reset).status_code, 204)
        self.assertEqual(self.client.post(self.reset_url, reset).status_code, 400)

    def test_legacy_shared_tokens_are_rejected_by_both_endpoints(self):
        data = user_token_data(self.user, purpose="verification")
        data["token"] = default_token_generator.make_token(self.user)
        self.assertEqual(self.client.post(self.verify_url, data).status_code, 400)
        self.assertEqual(self.client.post(self.reset_url, {**data, "password": "Another-safe-pass-123!"}).status_code, 400)

    def test_disabled_accounts_cannot_consume_tokens(self):
        data = user_token_data(self.user, purpose="password_reset")
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.client.post(self.reset_url, {**data, "password": "Another-safe-pass-123!"}).status_code, 400)

    def test_tokens_expire_and_verification_state_invalidates_verification_token(self):
        from datetime import timedelta
        from unittest.mock import patch
        from django.utils import timezone

        for generator in (password_reset_token_generator, verification_token_generator):
            token = generator.make_token(self.user)
            with patch.object(generator, "_now", return_value=generator._now() + timedelta(hours=2)):
                self.assertFalse(generator.check_token(self.user, token))
        token = verification_token_generator.make_token(self.user)
        self.user.email_verified_at = timezone.now()
        self.assertFalse(verification_token_generator.check_token(self.user, token))

    def test_malformed_user_id_is_a_validation_error(self):
        self.assertEqual(self.client.post(self.verify_url, {"uid": "bm90LWEtdXVpZA", "token": "invalid"}).status_code, 400)
