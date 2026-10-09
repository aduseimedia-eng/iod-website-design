# IoD-Gh website and platform

The Institute of Directors-Ghana website is being delivered in deliberate phases.

- **Phase 1:** Next.js frontend, design system, and static page interface.
- **Phase 2A:** Django / Django REST Framework foundation, PostgreSQL configuration, API conventions, health check, OpenAPI documentation, and initial test coverage.
- **Phase 2B:** Secure session authentication, registration, email verification, password reset, staff-role foundations, throttling, and audit logs.
- **Phase 2C / Phase 3B:** Membership types and applications, protected applicant tracking, member profiles, staff approval/status workflows, renewals, privacy-conscious good-standing verification, and the connected member-membership portal.

The frontend now connects the authentication flows, membership application, and member membership/profile views to the Django API. Future modules will connect to real data incrementally.

## Repository layout

```text
src/       Next.js application and static Phase 1 interface
public/    Frontend image and document assets
backend/   Django API foundation and backend documentation
```

## Frontend

```powershell
npm install
npm run dev
```

For the live membership form, run the Django API and set this local frontend environment value if the API is not at its default address:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:8010"
```

The membership application and protected member portal use the centralized API client. Django must allow the frontend origin through `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`; the backend example configuration already includes `http://localhost:3000`.

## Backend

See [backend/README.md](backend/README.md) for environment setup, PostgreSQL development configuration, migration commands, endpoints, and test commands.

## Railway deployment

The repository is prepared as a three-service Railway monorepo: the main site,
the examination portal, and the Django API. See
[docs/railway-deployment.md](docs/railway-deployment.md) for the required
domains, service roots, environment variables, PostgreSQL, ClamAV, durable media
storage, and release checks. Secrets are configured only in Railway, never in Git.

## Current backend scope

Training, examinations, payment collection, notifications, and provider integrations remain staged work. Membership rules, public-listing consent, fees, renewal periods, and retention decisions remain configurable and require IoD-Gh approval before live use.
