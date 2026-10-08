# Security fixes and deployment requirements

## Implemented

- Next.js and its ESLint configuration upgraded from 16.3.7 to 16.3.8 for the
  security advisories reported by the dependency audit.
- Django REST Framework upgraded from 3.16.1 to 3.17.2 for the two advisories
  reported by the Python dependency audit.
- Separate, one-hour email-verification and password-reset tokens. Verification
  and reset consume their tokens. Legacy shared-purpose links are intentionally
  invalid: request new emails. Account records/passwords are not reset.
- Atomic, shared PostgreSQL rolling-window rate limits. Forwarding headers are
  ignored unless the immediate peer is in `TRUSTED_PROXY_CIDRS`; the chain is
  walked from the trusted edge, not from the client-controlled leftmost entry.
- Upload content checks for images, PDF, DOC and DOCX; an explicit audio/video
  signature allowlist. Reject disguised HTML/SVG, invalid documents, encrypted
  documents and detected active document content. Browser MIME is not trusted.
  Signature checks and document parsing do not guarantee a file is harmless.
- ClamAV streaming scans before saving/emailing new uploads. With a scanner
  configured, a timeout/error prevents the upload (503), even in development.
  Production unconditionally requires a scanner. Existing media is not scanned,
  rewritten or deleted by this change.
- Per-request nonce CSP, anti-framing, MIME-sniffing and referrer headers on the
  frontend. Same-origin frames remain permitted for CMS draft previews. Inline
  styles remain allowed for existing CMS/editor styling; production scripts do
  not allow `unsafe-inline` or `unsafe-eval`. Nonce-bearing HTML must not be cached
  by a CDN. External HTTPS images/media remain allowed for CMS content.
- Docker database/admin ports are loopback-only. PostgreSQL no longer has a
  hardcoded default password. Keep generated credentials in ignored `.env` or a
  production secret manager. Changing Docker's environment alone does **not**
  rotate passwords in an existing database volume.

## Before deployment

1. Install `backend/requirements/base.txt`, then apply migrations, including
   `common.0005_ratelimitbucket`. Existing analytics migration 0004 must accompany it.
2. Use production settings and strong, separate production credentials. Configure
   HTTPS, real allowed hosts, exact CORS/CSRF origins, sender email and
   `NEXT_PUBLIC_API_BASE_URL`. Rebuild Next.js after changing its public API URL.
   Development `runserver` and Docker pgAdmin are not public production services.
3. Run a maintained ClamAV scanner on a private network with current signatures.
   The optional local service can be started with:

   ```powershell
   docker compose -f backend/docker-compose.yml --profile security up -d upload-scanner
   ```

   Once healthy, set `CLAMAV_HOST=127.0.0.1` in `backend/.env` for a host-run API
   (use the private service hostname for a containerized API) and restart Django.
   Allow 3–4 GiB of RAM. Do not publish port 3310 to the internet. The supplied
   service enables `AlertExceedsMax`, `AlertEncrypted`, scan size/time limits and
   automatic signature updates. Configure equivalent protections and readiness
   monitoring for production; verify clean-file acceptance and EICAR rejection.
   An absent scanner is permitted only for local development, not production.
4. Only configure actual reverse-proxy addresses in `TRUSTED_PROXY_CIDRS`. The
   proxy must replace/append forwarding headers correctly and direct access to
   the API must be restricted. Configure HTTPS forwarding for the chosen host;
   do not blindly trust `X-Forwarded-Proto` from the internet.
5. Schedule `python manage.py clear_expired_rate_limits` daily. Counters retain
   keyed hashes, not raw IPs; expired rows otherwise remain in the database.
6. Configure request body limits (e.g. 25 MB), request timeouts, edge rate limits
   and monitoring. Application throttles are not DDoS protection. Serve uploads
   with correct content types and `nosniff`, preferably on a separate, cookieless
   media origin, with scripts disabled and document downloads as attachments.
7. Review existing uploaded files separately, configure backups and restore tests,
   and run `manage.py check --deploy --settings=config.settings.production` with
   the real deployment environment. Recheck the deployed HTTPS site and login,
   verification, reset, upload and CMS-preview workflows before public launch.

## Verification

```powershell
.\.venv\Scripts\python.exe backend/manage.py test --settings=config.settings.test --noinput
npm run build
# In another terminal: npm run start -- --hostname 127.0.0.1 --port 3001
node scripts/test-security-headers.mjs
```

These checks are regression tests, not a complete penetration test or a guarantee
that the eventual hosting configuration is secure.

The local database credential and Django secret were replaced with generated
values in ignored configuration. Existing local sessions and old emailed links
are invalidated; sign in again and request fresh links. Production should use its
own separately generated credentials. Accounts and existing uploads are preserved.

The local verification includes 68 backend tests, concurrent PostgreSQL throttling,
production HTTP nonce/header checks and live ClamAV clean-file/EICAR checks.
Interactive browser testing was unavailable because no browser was connected.
The full Django deployment check still reports pre-existing OpenAPI schema
documentation warnings; its security-only deployment check passes.

One upstream advisory remains in development tooling: `braces`
(`GHSA-vfj7-8cjw-p6xm`), transitively used by the Next.js ESLint plugin. The full
npm audit reports it against five packages in that dependency chain. No patched
`braces` version is offered by the audit; its proposed forced fix would downgrade
Next.js ESLint to an incompatible older major. It is not in the production npm
dependency graph. Only run lint with trusted repository configuration/glob
patterns and recheck for an upstream fix; do not treat this as a clean full audit.

References: [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy),
[ClamAV Docker deployment](https://docs.clamav.net/manual/Installing/Docker.html),
[ClamD protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html).
