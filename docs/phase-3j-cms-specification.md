# Phase 3J — CMS & Website Content Management

**Status:** historical implementation blueprint. The staff UI and permission rules are superseded by [Simple website CMS](simple-cms.md).  
**Scope:** IoD-Gh public website, Django CMS API, and the staff admin workspace  
**Replaces:** the current lightweight `ContentPage` / `ContentItem` editing model over time; it is not a destructive replacement on day one.

## 1. Purpose and operating principle

Phase 3J turns the website into a controlled publishing system.

- **IoD staff edit content**: copy, images, documents, news, navigation labels, homepage sections, SEO, and member-facing notices.
- **Developers own presentation**: routes, approved page templates, React components, design tokens, validation schemas, integrations, and deployment.
- **The public website reads published content only.** A saved draft must never be reachable from a public endpoint or a guessed URL.
- **Every public change is traceable and reversible.** Publishing selects a revision; it does not overwrite history.

This is intentionally not a free-form website builder. An administrator can arrange and populate approved content blocks, but cannot inject JSX, arbitrary scripts, CSS, or unreviewed HTML into the website.

## 2. Decisions made by this specification

| Decision | Phase 3J rule |
| --- | --- |
| Content identity | A page or article is a permanent logical record. Its editable and live content are revisions. |
| Public content | The public API serializes the current published revision only. |
| Editing | Each explicit **Save draft** creates an immutable, numbered revision. |
| Layout control | Each page selects a developer-owned `template_key`; each template accepts an allow-listed set of section types. |
| Rich content | Structured JSON blocks are validated against a server-side and frontend block registry. No raw executable content is accepted. |
| Publishing | Any logged-in staff admin may publish immediately, unpublish, or restore an older revision as a new draft. |
| Preview | Previews use short-lived, signed, revision-specific tokens. They do not change the live website. |
| Cache refresh | Django sends a signed webhook to Next.js after a publish/unpublish/navigation/settings event. Next invalidates the relevant cache tags. |
| Migration safety | The existing content endpoints stay available until the new CMS has been migrated, verified, and accepted. |

## 3. Admin access — no CMS permission tiers

Phase 3J deliberately has **no Author, Reviewer, Publisher, Content Manager, or group-based CMS roles**. Every logged-in account with Django's existing `is_staff` administration flag has the same CMS workspace: create, edit, upload, preview, publish, restore, unpublish, manage navigation, and manage global settings. Superusers work the same way.

The public still cannot access staff CMS endpoints. Authentication and CSRF protection remain technical safeguards; they are not editorial permission tiers.

## 4. Content states and publishing workflow

### 4.1 State model

`ContentPage` and `Article` retain their live identity. Their revisions use the following states:

| Revision state | Meaning | Allowed next action |
| --- | --- | --- |
| `DRAFT` | Private work in progress. | Save successor draft, submit, discard. |
| `IN_REVIEW` | Submitted to a reviewer/publisher. | Return to draft, approve/schedule, publish. |
| `SCHEDULED` | Approved and waiting for `publish_at`. | Publish now, reschedule, return to draft. |
| `PUBLISHED` | The revision currently selected by the parent object as live. | Create a new draft from it, archive through a replacement/unpublish. |
| `ARCHIVED` | Historical live revision, no longer public. | Restore as a new draft. |
| `SUPERSEDED` | Historical draft superseded by a later saved draft. | Restore as a new draft. |

The parent page/article may show **Published + draft changes**. This is important: creating a new draft never takes the existing live revision offline.

### 4.2 Workflow

```text
Staff admin saves draft
        │
        ▼
   DRAFT revision ── submit ──► IN_REVIEW ── publish ──► PUBLISHED
        │                            │                         │
        │                            └── return ────────────────┘
        │
        └── schedule ──► SCHEDULED ── due time ────────────────► PUBLISHED

Any historical revision ── restore ──► new DRAFT revision
```

1. A staff admin edits a local form/section workspace.
2. **Save draft** validates the full payload and, in one database transaction, creates a new immutable revision and its ordered sections. The previous current draft becomes `SUPERSEDED`.
3. A staff admin may keep the revision private or publish it immediately. The optional `IN_REVIEW` and `SCHEDULED` states are retained for a future internal process but do not restrict access.
4. Any staff admin may publish immediately. The system stores all timestamps in UTC.
5. Publishing atomically changes the parent object's `published_revision` pointer. The previous live revision becomes `ARCHIVED`; the new one becomes `PUBLISHED`.
6. The publish service writes an audit event, queues cache invalidation, and sends a signed Next.js revalidation webhook after the database transaction commits.
7. **Restore** never mutates history. It clones the selected old snapshot into the next numbered draft.

Unpublishing clears `published_revision`, archives the prior live revision, produces a cache event, and returns an intentional public 404/empty navigation result. It is not a delete operation.

### 4.3 Guardrails

- The publishing endpoint must reject invalid paths, malformed blocks, missing required SEO fields, disallowed section types, unresolved internal navigation links, and unpublished media that is required by the page.
- `If-Match` / revision version is required when a draft is saved. If another editor saved first, the API returns `409 Conflict` with both revision identifiers rather than silently overwriting work.
- Publishing and unpublishing use `transaction.atomic()` plus `select_for_update()` on the parent record.
- Scheduled publication runs through `publish_due_content` every minute (a Django management command invoked by the production scheduler). A task queue can replace this runner later without changing the service layer.

## 5. Database schema

All primary content records use UUID primary keys. Timestamps use `created_at` and `updated_at`; staff actions capture an actor foreign key to `AUTH_USER_MODEL` where applicable. Deletion of published content is soft deletion only.

### 5.1 Pages, revisions, and sections

#### `ContentPage`

The durable identity and route of a page. It holds no editable body copy.

| Field | Type / rule |
| --- | --- |
| `id` | UUID, primary key |
| `path` | `CharField`, unique canonical path such as `/about-us`; `/` is the homepage |
| `slug` | `SlugField`, unique, used for internal references |
| `label` | Short staff-facing label |
| `template_key` | Developer-owned key, e.g. `home`, `standard`, `article_index`, `membership`, `training`, `directory` |
| `published_revision` | Nullable FK to `PageRevision`, `PROTECT` |
| `current_draft_revision` | Nullable FK to `PageRevision`, `SET_NULL` |
| `is_system_page` | Boolean; prevents staff from changing routes/templates for required routes |
| `is_deleted`, `deleted_at` | Soft-delete fields |
| `created_by`, `updated_by` | User FKs |

`path` is validated as a canonical internal path: leading `/`, no origin, no query string, normalized trailing slash policy, and no collision with admin/API routes.

#### `PageRevision`

An immutable complete version of a page after it is saved.

| Field | Type / rule |
| --- | --- |
| `id` | UUID, primary key |
| `page` | FK `ContentPage`, `CASCADE` |
| `number` | Positive integer, unique with `page` |
| `state` | `DRAFT`, `IN_REVIEW`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`, `SUPERSEDED` |
| `title`, `eyebrow`, `summary` | Revision-specific text fields used by the template as applicable |
| `seo_title`, `seo_description`, `canonical_path`, `robots` | Revision-specific SEO fields |
| `social_image` | Nullable FK `MediaAsset`, `PROTECT` |
| `snapshot` | JSON copy of the full validated page payload, including ordered sections; used for diffing and restoration |
| `change_summary` | Required on submit/publish; visible in revision history |
| `review_note` | Optional reviewer feedback |
| `created_by`, `submitted_by`, `published_by` | User FKs as applicable |
| `created_at`, `submitted_at`, `publish_at`, `published_at` | Timestamps |

`snapshot` is authoritative for restoration. Its corresponding `PageSection` rows make ordered sections queryable and simplify CMS editing. A save service creates both from the same validated request; application code never lets them diverge.

#### `PageSection`

An ordered approved block inside a particular page revision.

| Field | Type / rule |
| --- | --- |
| `id` | UUID, primary key |
| `revision` | FK `PageRevision`, `CASCADE` |
| `slot` | Optional named template placement, such as `hero`, `main`, `aside`, `footer_cta` |
| `section_type` | Allow-listed registry key |
| `position` | Non-negative integer; unique with revision + slot |
| `data` | Validated JSON content/configuration for this block |
| `primary_media` | Nullable FK `MediaAsset`, `PROTECT` |
| `is_enabled` | Boolean, allowing a draft block to be deliberately hidden |

Initial section types are: `hero`, `rich_text`, `callout`, `stat_grid`, `card_grid`, `feature_list`, `quote`, `image`, `image_with_copy`, `document_list`, `article_feed`, `event_feed`, `cta_banner`, `member_directory`, and `contact_details`. The template registry determines which types and slots are allowed on each template.

### 5.2 Media library

#### `MediaAsset`

| Field | Type / rule |
| --- | --- |
| `id` | UUID, primary key |
| `file` | `FileField`; storage adapter determines local/S3 storage |
| `original_filename`, `storage_key` | Immutable source and generated storage location |
| `mime_type`, `byte_size`, `checksum_sha256` | Captured during upload |
| `width`, `height`, `duration_seconds` | Nullable metadata where relevant |
| `alt_text` | Required for images before a revision referencing it can publish |
| `caption`, `credit`, `focal_x`, `focal_y` | Optional accessibility/presentation metadata |
| `kind` | `IMAGE`, `DOCUMENT`, `VIDEO`, `AUDIO` |
| `status` | `PROCESSING`, `READY`, `REJECTED`, `ARCHIVED` |
| `uploaded_by`, `created_at` | Audit fields |
| `is_deleted`, `deleted_at` | Soft delete; hard deletion only after reference check and retention window |

Uploads are multipart, authenticated, size-limited, MIME-validated by file signature (not file extension), and stored under generated UUID paths. SVG is sanitized or disallowed initially; executables and HTML files are rejected. The API generates thumbnails/derivatives for images where the storage provider supports it.

### 5.3 Navigation

Navigation has its own small revision workflow so a menu edit cannot appear half-finished on the live header/footer.

#### `NavigationMenu`

`id`, unique `key` (`header_primary`, `header_utility`, `footer_about`, `footer_services`, `footer_legal`), label, `published_revision`, `current_draft_revision`, timestamps.

#### `NavigationRevision`

`id`, `menu`, `number`, workflow state, `snapshot`, change summary, actor/timestamps. It follows the same draft/review/publish rules as pages.

#### `NavigationItem`

`id`, `revision`, nullable `parent`, `position`, `label`, `link_type` (`PAGE`, `INTERNAL_PATH`, `EXTERNAL_URL`, `ANCHOR`), nullable `page`, nullable `href`, `open_in_new_tab`, `is_enabled`.

Rules: maximum nesting depth of two, no circular parent relationships, published `PAGE` links must reference a currently published page, and external URLs must be `https` unless explicitly allow-listed.

### 5.4 Site settings

`SiteSettingsSet` is a versioned group of global settings with `published_revision` and `current_draft_revision` pointers. `SiteSettingsRevision` contains the immutable JSON snapshot and workflow data.

The allowed setting keys are registered in code and validated by schema. Initial settings include:

- organisation name, postal address, telephone, general email, social links
- default SEO title, description, canonical origin, default social image, organisation schema fields
- header alert/banner copy and visibility
- footer copy, copyright, newsletter/contact details
- site-wide call-to-action labels and destinations
- Google/analytics identifiers only when supplied by a Site Administrator

There is no arbitrary key/value editor exposed to ordinary authors. This prevents accidental configuration drift or secret disclosure.

### 5.5 Articles and categories

#### `Category`

`id`, `taxonomy` (`NEWS`, `INSIGHT`, `EVENT`, `DOCUMENT`), `name`, unique `slug` within taxonomy, `description`, nullable `parent`, `position`, `is_active`. Categories are staff-managed taxonomy, not free text entered per article.

#### `Article`

Durable article identity: `id`, unique `slug`, `content_type` (`NEWS`, `INSIGHT`, `EVENT`, `NOTICE`), `primary_category`, M2M `categories`, `published_revision`, `current_draft_revision`, `author_display_name`, `publish_at`, soft-delete/audit fields.

#### `ArticleRevision`

The article equivalent of `PageRevision`: number, state, title, standfirst, `body_snapshot`, cover media, SEO fields, snapshot, change/review information and action timestamps. Body blocks use the same allow-listed renderer as rich page sections. Future event-specific fields (start/end/location/registration URL) are validated only for `EVENT` content type.

### 5.6 Auditing and previews

#### `ContentAuditEvent`

Append-only record: `id`, actor, action, object type, object UUID, revision UUID where relevant, before/after summary, request correlation ID, IP/user-agent when available, timestamp. It records uploads, draft saves, submissions, review decisions, publishing, scheduling, unpublishing, restores, menu/settings changes and failed sensitive attempts.

#### `PreviewSession`

`id`, content object/revision reference, `token_hash`, `expires_at`, `created_by`, `revoked_at`, `last_accessed_at`. The raw token is returned exactly once and is stored only as a hash. It is short-lived (default 24 hours), revision-specific and revocable.

## 6. API contract

The existing `/api/v1/content/` endpoints remain during migration. Phase 3J introduces `/api/v2/cms/`; it does not change public endpoints in place.

### 6.1 Public, anonymous, published-only endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /api/v2/cms/site/` | Published global settings plus the published header/footer menu payload required by the current page shell. |
| `GET /api/v2/cms/pages/resolve/?path=/about-us` | Resolve one published page by canonical route path and return its published revision/sections. |
| `GET /api/v2/cms/pages/{slug}/` | Resolve one published page by slug for internal consumers. |
| `GET /api/v2/cms/navigation/{key}/` | Published menu only. |
| `GET /api/v2/cms/articles/?type=NEWS&category=&page=1&page_size=12` | Paginated published article listing. |
| `GET /api/v2/cms/articles/{slug}/` | One published article. |
| `GET /api/v2/cms/categories/?taxonomy=NEWS` | Active categories only. |

Public responses contain resolved public media URLs and safe fields only. They never expose draft state, reviewer notes, internal media paths, audit information, uploader details, or unpublished related objects.

An example resolved page response has this shape:

```json
{
  "id": "page-uuid",
  "path": "/about-us",
  "templateKey": "standard",
  "revision": {
    "number": 8,
    "title": "About the Institute",
    "seo": {
      "title": "About IoD-Gh | Institute of Directors Ghana",
      "description": "…",
      "canonicalPath": "/about-us",
      "robots": "index,follow"
    },
    "sections": [
      { "id": "section-uuid", "type": "hero", "slot": "hero", "data": { "heading": "…" } },
      { "id": "section-uuid", "type": "rich_text", "slot": "main", "data": { "blocks": [] } }
    ]
  },
  "publishedAt": "2026-10-02T12:00:00Z"
}
```

### 6.2 Staff endpoints

All staff endpoints require an authenticated staff-admin session/token and CSRF protection where cookie authentication is used. There are no separate CMS roles or group checks.

| Area | Endpoints |
| --- | --- |
| Pages | `GET/POST /staff/cms/pages/`; `GET/PATCH /staff/cms/pages/{id}/`; `POST /staff/cms/pages/{id}/drafts/`; `GET /staff/cms/pages/{id}/revisions/`; `GET /staff/cms/pages/{id}/revisions/{number}/`; `POST /staff/cms/pages/{id}/revisions/{number}/submit/`; `POST .../return/`; `POST .../publish/`; `POST .../schedule/`; `POST .../restore/`; `POST .../unpublish/`. |
| Previews | `POST /staff/cms/pages/{id}/revisions/{number}/preview-sessions/`; `DELETE /staff/cms/preview-sessions/{id}/`. Equivalent article routes are provided. |
| Media | `GET/POST /staff/cms/media/`; `POST /staff/cms/media/upload/`; `GET/PATCH /staff/cms/media/{id}/`; `POST /staff/cms/media/{id}/archive/`. |
| Articles | Same lifecycle pattern under `/staff/cms/articles/`, plus filter/search/category assignment. |
| Categories | `GET/POST /staff/cms/categories/`; `PATCH/DELETE /staff/cms/categories/{id}/`. |
| Navigation | `GET/POST /staff/cms/navigation/menus/`; `GET/PATCH /staff/cms/navigation/menus/{key}/`; revision lifecycle routes under the menu; item editing and a `POST .../reorder/` operation. |
| Site settings | `GET /staff/cms/settings/`; `POST /staff/cms/settings/drafts/`; revision review/publish/restore routes. |
| Audit | `GET /staff/cms/audit/?object_type=&object_id=&actor=&from=&to=` for managers only. |

`POST .../drafts/` accepts a complete validated page/article payload and an `If-Match` revision marker. It creates the next revision; `PATCH` never changes a published revision in place. Bulk operations (for example, publishing selected news) create an audit event per object and report per-object failures rather than silently partially succeeding.

### 6.3 Preview endpoint

`GET /api/v2/cms/preview/pages/{page_id}/?token=...` returns only the exact authorized revision, with `Cache-Control: private, no-store`. The token is verified against `PreviewSession`, expiry and revocation. Next.js uses this endpoint only in preview mode; public components never call it.

### 6.4 Error format and API quality

Use a consistent error object:

```json
{
  "code": "invalid_section",
  "message": "The card_grid block is not allowed in the hero slot.",
  "fieldErrors": { "sections[2].type": ["Not allowed for template standard."] },
  "requestId": "…"
}
```

List endpoints are paginated and accept documented filter/sort parameters only. Staff lists default to recently changed content; public article lists default to newest published content. All sorting is stable with a UUID tie-breaker.

## 7. Admin CMS interface

The CMS lives under the existing protected Next.js admin area as `/admin/cms`. It is a staff workspace, not Django's stock admin. Django admin remains a developer/support fallback for records, not the editorial workflow.

### 7.1 Navigation

```text
CMS
├── Dashboard
├── Pages
│   └── Homepage
├── Articles
├── Media library
├── Navigation
├── Site settings
├── Categories
└── Audit history
```

The dashboard shows content awaiting review, scheduled publications, recently published content, broken/unused media warnings, and a direct link to the current public page.

### 7.2 Pages and homepage editor

The Pages list supports search, route/template/status filters, author, date, and sort by title/path/last changed. Its columns are: page label, path, template, live revision, draft/review state, changed by, last changed, and actions.

The page editor has:

1. **Top bar:** status badge, live/draft revision number, last editor, Save draft, Submit, Preview, Publish/Schedule, revision history.
2. **Page details:** staff label, path, developer-approved template selection (restricted for system pages).
3. **Section canvas:** add only supported sections, drag/reorder within permitted slots, duplicate, disable, remove, and select a section.
4. **Section inspector:** structured fields based on that section's schema; media picker uses the library; internal links use page/article search instead of copied URLs.
5. **SEO tab:** SEO title, meta description, canonical path, robots directive, social image, live character counts and page-level validation.
6. **Validation panel:** blocking errors and publish warnings, with links to the affected field.
7. **Revision panel:** timeline, author, change summary, state, side-by-side structured diff, preview selected revision, and Restore as new draft.

The Homepage item is the same page editor constrained to `path = /` and `template_key = home`. Its allowed slots make its hero, programmes, membership callouts, news/event feeds, partner area, and closing CTA editable without letting an editor change the site shell or source code.

### 7.3 Articles, media, navigation and settings

- **Articles:** editorial list/detail editor with title, slug, category, author name, cover image, blocks, SEO, publish date, workflow controls and revision history. News feeds on the public site are driven by published articles, not manually duplicated cards.
- **Media library:** grid/list view, upload drop zone, search, file-kind filters, usage count, alt-text status, dimensions/file size, replace-by-new-asset flow, and archive confirmation. A media item shows every page/article that references it before archival.
- **Navigation:** a tree editor for each named menu. Editors choose an internal page/article from a searchable picker or explicitly set an external HTTPS URL. It has its own Preview/Publish lifecycle and validates link integrity before publishing.
- **Site settings:** grouped, typed forms (organisation, contact, social, default SEO, header banner, footer, global CTAs). Settings are versioned, reviewed and published as one configuration revision.
- **Audit history:** read-only, filterable timeline with actor, action, target, timestamp and links to the relevant revision.

The UI must have keyboard-accessible controls, clear unsaved-change warnings, full empty/error states, and responsive layouts. Every logged-in staff admin sees the same publish controls.

## 8. Block and template registry

Both Django and Next.js share a versioned schema contract. The frontend rendering registry is developer-owned:

```text
template_key ──► allowed slots ──► allowed section_type ──► schema + React renderer
```

For example, the `standard` template may accept `hero` in the `hero` slot and `rich_text`, `image_with_copy`, `quote`, `document_list`, and `cta_banner` in `main`; it cannot accept a directory block. The `directory` template may accept `member_directory` but that block's data only controls copy/filter defaults—the member data remains sourced from the membership API.

Each section type has:

- a JSON schema/Pydantic-or-DRF validator in Django;
- a TypeScript/Zod type at the Next.js boundary;
- an admin form definition;
- a React renderer;
- an explicit backward-compatible schema version.

Schema migrations are developer work. When a section definition changes, a migration service upgrades saved data before it can be edited/published; it does not rely on untyped `JSON.parse` at render time.

## 9. Django implementation architecture

Keep the current `apps.content` app as the home of the CMS, but separate concerns so the old foundation and new API can coexist.

```text
backend/apps/content/
├── models/
│   ├── page.py              # ContentPage, PageRevision, PageSection
│   ├── article.py           # Article, ArticleRevision, Category
│   ├── media.py             # MediaAsset
│   ├── navigation.py        # menus, revisions, items
│   ├── settings.py          # global settings revisions
│   └── audit.py
├── services/
│   ├── revisions.py         # clone/save/restore/diff
│   ├── publishing.py        # transaction-safe state changes
│   ├── validation.py        # template/block/link/media checks
│   ├── media.py
│   └── revalidation.py      # reliable webhook outbox delivery
├── api/v2/
│   ├── public.py
│   ├── staff.py
│   ├── serializers.py
├── management/commands/
│   ├── publish_due_content.py
│   └── migrate_legacy_content.py
└── tests/
```

An **outbox table** (or equivalent durable post-commit job) records Next.js revalidation events. The publishing transaction must succeed independently of temporary frontend webhook failure. A retry worker/management command delivers pending events with an idempotency key; the public page may use a time fallback until the retry succeeds.

The current `ContentPage` and `ContentItem` models remain untouched in the first migration. New models are added alongside them, migrations are applied, and a reversible importer maps current records into the new format.

## 10. Next.js integration

### 10.1 Public rendering

Create a typed CMS adapter, for example:

```text
src/lib/cms/public.ts          # public Django fetches and response validation
src/lib/cms/preview.ts         # preview-only requests
src/components/cms/BlockRenderer.tsx
src/components/cms/blocks/*    # developer-owned renderers
src/lib/cms/templateRegistry.ts
src/app/api/cms/revalidate/route.ts
src/app/preview/route.ts       # verifies preview session and enables preview mode
```

Public pages should request Django content on the server through this adapter and render it through the approved template/block registry. Existing bespoke React layouts can be migrated one route at a time by making their visible text, images, cards and SEO props read from CMS content instead of hard-coded strings.

The adapter validates the API response with Zod before rendering. An invalid response renders a controlled error/fallback and is logged; it must not cause arbitrary JSON to become markup.

### 10.2 Cache and revalidation

The project uses Next.js 16's Cache Components model when it is enabled in `next.config`. Public CMS reads are cached at data level with `use cache`, a long `cacheLife`, and precise `cacheTag`s such as:

- `cms:site`
- `cms:nav:header_primary`
- `cms:page:{page-id}` and `cms:path:{path}`
- `cms:article:{article-id}` and `cms:articles:news`

On publish/unpublish, Django POSTs a JSON event to `POST /api/cms/revalidate` in Next.js. The request contains the event ID, affected paths/tags, timestamp, and HMAC signature using a secret shared only by the two servers. The route handler verifies timestamp/signature/idempotency, calls `revalidateTag(tag, 'max')` for supplied approved tags and `revalidatePath(path)` only where necessary, then returns success. The route rejects unknown tags, replayed events and unsigned requests.

This provides prompt updates while retaining a safe time-based cache profile as a fallback. The publish screen reports **Published; public cache refresh pending** if the outbox event has not yet been delivered.

### 10.3 Preview

The staff editor requests a preview session from Django, then opens a Next.js preview URL carrying the short-lived token. The Next route verifies it with Django, uses preview/draft mode only for that browser session, and fetches the authorized exact revision with `no-store`. Preview responses are never placed in public cache tags and show a clear **Preview — not live** banner.

SEO metadata is generated from the same published (or preview) revision used by the page body, so title/description/canonical/social preview cannot drift from the displayed content.

## 11. Migration from the current CMS foundation

1. **Inventory and freeze the contract.** Document every current public route, `ContentPage`, `ContentItem`, homepage field, static text source, menu and SEO value. Do not stop current content editing yet.
2. **Add Phase 3J models and services.** Add migrations and tests without deleting legacy models or endpoints.
3. **Seed/import legacy content.** Map each existing `ContentPage` to `ContentPage` + revision. Map each `ContentItem` collection to an appropriate page section or an article, keeping original IDs in an import reference field for traceability.
4. **Build staff pages behind a feature flag.** Use `CMS_V2_ENABLED` / per-route rollout so selected staff can review imported content before it drives production pages.
5. **Migrate homepage and global navigation first.** Verify draft/preview/publish/revalidate end-to-end in staging.
6. **Migrate page families.** About, membership, training, knowledge, events, directory wrappers and other menu routes move one family at a time. The membership directory itself continues to use the membership API/data—not CMS copy.
7. **Switch public consumers.** Each frontend route changes to the new public adapter only after a content and visual parity check.
8. **Acceptance and rollback window.** Retain legacy content/API read support for at least one accepted release cycle. Keep an export and a feature-flag fallback before retiring old admin views/endpoints.

No member records, good-standing publication controls, payments, or examination data are migrated into CMS content. CMS may control surrounding page copy/SEO only; operational data remains in its existing domain application.

## 12. Delivery sequence

| Slice | Deliverable | Exit criteria |
| --- | --- | --- |
| 3J.1 | Models, migrations, roles, block/template schema registry, audit foundation | Revisions can be created/restored in tests; no legacy data is removed. |
| 3J.2 | Page APIs, page editor, revision history, signed preview | Any staff admin can draft, preview, publish and rollback a test page. |
| 3J.3 | Media library, settings, navigation workflows | Images/documents, header/footer and site details are safely editable/publishable. |
| 3J.4 | Articles/categories and article feeds | Staff can manage news/insights; public feeds read published articles. |
| 3J.5 | Next public adapter, cache webhook, route-by-route migration | Published changes appear promptly on the real route; drafts remain private. |
| 3J.6 | Import, acceptance, training and legacy retirement plan | Existing content is preserved, owners sign off, and rollback is documented. |

## 13. Acceptance criteria

Phase 3J is complete only when all of the following are demonstrably true:

- Any staff admin can alter homepage/page/article copy and media without touching source code.
- Saving a draft never changes the public page, navigation, SEO, sitemap output, or public API.
- Any staff admin can preview, publish, unpublish and restore content with a visible audit trail.
- The live page, metadata and social image derive from the same published revision.
- An editor cannot choose an unapproved layout, render unsafe markup, or publish a broken internal menu link.
- Navigation, site settings, articles, categories and media all have one shared staff-admin screen set, without CMS role tiers.
- Public endpoints return only published data; direct requests for a draft/revision fail without a valid preview session.
- A publish event updates the relevant Next.js page/menu cache through authenticated, retryable invalidation.
- Legacy `ContentPage` / `ContentItem` content has been migrated and visually verified before any retirement.
- Django unit/integration tests and Next.js component/E2E tests cover staff authentication, validation, revision transitions, preview expiry, publish atomicity, cache webhook authentication and public draft-leak prevention.

## 14. Immediate implementation starting point

Begin with **Phase 3J.1**, not visual polish: introduce the revision-capable page models, workflow service, shared staff-admin access, audit log and migrations alongside the existing models. Once those are tested, build the page editor and preview against the real lifecycle. This sequence ensures the admin interface is backed by a reliable publishing system rather than becoming another screen that writes directly to live content.
