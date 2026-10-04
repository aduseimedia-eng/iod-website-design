# Simple website CMS

This replaces the UI and permission requirements in the earlier Phase 3J specification. The latest user instruction is authoritative: every authenticated admin account (Django staff or superuser) can edit and publish all website content. Named business roles do not restrict CMS actions. Member accounts cannot access the CMS.

## Staff workflow

Open **Content → Pages**, search for a page, and choose **Edit**. The editor opens immediately with its current content. Existing page text, images and links use plain fields. Sections and search-engine settings are collapsed to keep the page manageable.

- **Save Changes** updates a published page immediately. A never-published page stays a draft until **Publish** is selected.
- **Save Draft** keeps changes private.
- **Preview** saves a draft and opens a private preview. It never publishes.
- **Home** is one page, with the existing homepage sections available to edit, hide and reorder.
- Home’s **Partners** section shows a logo grid. Choose **Add partner logo**, enter the partner name, select/upload its logo and optionally add a website link. Reorder with Move up/down, then Save Changes. Logo proportions are preserved; entries without logos remain hidden from the public site.
- **News** has its own list and editor. Existing news was copied into article records.
- **Media Library** supports search, upload, image selection, details, replacement and removal from the library. Removal archives the record; files referenced by existing content remain available.
- **Navigation** edits names, page/external links, ordering and nesting.
- **Settings** edits the organisation name, logo, favicon, contact details and social links.

## Developer integration

Django remains the source of published content. Existing page/article revisions, navigation, media and settings models are retained. Staff never edit storage objects, raw HTML, JSON, layout keys or revision numbers.

Predefined section forms and public section rendering live in `src/components/admin/cms/Sections.tsx` and `src/components/cms/ContentRenderer.tsx`. Rich text uses Tiptap's constrained formatting toolbar and is sanitised on both write and render.

Existing public layouts remain in source control. `EditableCopy`, `EditableImage` and `EditableLink` bind their existing content to page fields. Keys derive from developer-owned fallback values; staff see readable labels. When changing a fallback in source, register the new field and migrate a prior edited value if applicable.

Run normal migrations, start Next.js, then register the rendered fallback fields once:

```powershell
.venv/Scripts/python.exe backend/manage.py migrate
.venv/Scripts/python.exe backend/manage.py collect_page_copy
```

Registration is additive: it preserves previously saved field values and source records. It visits only a local server and populates existing published/draft snapshots with the content already displayed by the templates. It does not publish private drafts. Run it again after adding bindings to a template.

Homepage consolidation and news import are additive migrations. Original source records and revision history are retained. Old homepage-fragment admin links redirect to Home; old news-page admin links redirect to News.

Public layouts retrieve metadata through `cms-server.ts`. News detail routes resolve newly published articles, so new articles do not require source changes.

## Verification

```powershell
npm run lint
npm run build
.venv/Scripts/python.exe backend/manage.py test apps.content --settings=config.settings.test
```

Tests cover admin access regardless of named role, rejection of member accounts, draft/published isolation, signed private previews and safe rich text/links.

Run `node --test scripts/test-cms-rendering.mjs` to check that real public components render the CMS values for the member-register hero and news article fields. News preview uses the same article component as the public page, including author, category, date, cover image/caption and body. Author/category changes are snapshotted and remain private until publication.

The Members in Good Standing page's Hero fields control its main heading and introduction. Its editable page copy controls the previous-register text and PDF link. Member names and publication status remain in **Membership → Directory**, linked from the page editor. Register bindings for this page alone with `collect_page_copy --path /membership/members-in-good-standing`.
