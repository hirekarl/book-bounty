# BookBounty: Gemini Context & Instructions

**BookBounty** is a multi-tenant AI-powered personal library triage web app. Users scan books by ISBN, get an AI recommendation (KEEP/DONATE/SELL/DISCARD) based on their stated culling goal, and track outcomes over time.

---

## 1. Architecture

```
book-bounty/
├── backend/           # Django 6.x + DRF REST API
│   ├── core/          # settings.py, urls.py
│   └── triage/        # main app: models, views, serializers, ai_engine
├── frontend/          # React 19 + Vite SPA
├── docs/
│   ├── architecture/  # Living strategy (VISION.md, AI_SPEC.md, ORCHESTRATION.md)
│   ├── staff/         # Team brain (personae/, directives/, REFLECTION.md)
│   ├── roadmap/       # Planning (proposals/, completed/)
│   └── fellowship/    # User's personal domain (reflections/, research/, deliverables/, milestones/)
├── CLAUDE.md          # context file for Claude Code
└── GEMINI.md          # this file
```

**Stack:**
- Backend: Python 3.12, Django 6.x, DRF, SQLite, `uv` package manager
- Frontend: React 19, Vite, react-bootstrap (Bootstrap 5), Axios, React Router 7
- Auth: `dj-rest-auth` + `rest_framework.authtoken` (token auth)
- AI: Gemini 2.5 Flash via `google-genai` SDK + `instructor` for structured outputs
- Book metadata: Open Library API (by ISBN)
- Scanner: `html5-qrcode`
- Exports: `exceljs` (Excel), `jspdf` + `jspdf-autotable` (PDF), raw CSV

---

## 2. Data Models

### `Book`
Immutable metadata keyed by ISBN. Fetched from Open Library on first scan and cached.
- `isbn`, `title`, `author`, `publish_year`, `subjects` (JSON list), `cover_url`, `description`, `created_at`

### `CullingGoal`
User's stated goal for the current culling session. Fed verbatim to the AI as context.
- `user` (FK, non-nullable), `name`, `description`, `is_active` (only one active at a time), `created_at`

### `CatalogEntry`
One physical copy of a book with a triage decision.
- `user` (FK, non-nullable), `book` (FK), `culling_goal` (FK, nullable), `status` (KEEP/DONATE/SELL/DISCARD)
- `condition_grade` (MINT/GOOD/FAIR/POOR), `condition_flags` (JSON list)
- `notes`, `asking_price`, `donation_dest`
- `valuation_data` (JSON), `ai_recommendation` (JSON — stored raw AI response)
- `resolved_at` (nullable timestamp — null = pending decision, set = acted upon)
- `created_at`, `updated_at`

**"In Collection" definition:** `resolved_at IS NULL` OR (`resolved_at IS NOT NULL` AND `status = KEEP`)
Books physically still present = all unresolved + resolved KEEPs.

---

## 3. API Endpoints

Base URL: `http://localhost:8000/api/`

| Method | Path | Description |
|--------|------|-------------|
| POST | `auth/login/` | dj-rest-auth login — returns `{"key": "..."}` |
| POST | `auth/logout/` | Invalidates token |
| GET | `lookup/{isbn}/` | Fetch/cache book metadata; includes `metadata_found` flag. Validates ISBN format (400 on invalid). |
| GET/POST/PATCH | `entries/` | List (paginated, page_size=50) / create / update catalog entries |
| DELETE | `entries/{id}/` | Delete a catalog entry record |
| POST | `entries/{id}/resolve/` | Stamp `resolved_at = now()` (idempotent guard: 400 if already resolved) |
| POST | `entries/{id}/valuation/` | Fetch/refresh eBay market pricing into `valuation_data` |
| PATCH | `entries/bulk_update_status/` | `{"ids": [...], "status": "SELL"}` |
| GET | `stats/` | Dashboard counts: `{active: {...}, resolved: {...}, in_collection: N}` |
| GET/POST/PATCH | `goals/` | CRUD for culling goals |
| POST | `recommend/` | AI recommendation — see below |
| POST | `recommend/bulk/` | Bulk AI recommendations for multiple entries |
| GET | `search/` | Title/author search via Open Library — `?title=...&author=...`; returns candidate list for disambiguation |

### `POST /api/recommend/`
```json
{
  "isbn": "9780374528379",
  "culling_goal_id": 1,      // optional; falls back to active goal
  "condition_grade": "GOOD", // optional; defaults to GOOD
  "condition_flags": []      // optional
}
```
Returns `TriageRecommendation` schema (see ai_engine.py):
```json
{
  "status": "KEEP",
  "confidence": 0.85,
  "reasoning": "...",
  "suggested_price": null,
  "suggested_donation_dest": null,
  "notable_tags": [],
  "marketplace_description": null,
  "is_fallback": false
}
```
`is_fallback: true` when the AI client is unavailable — the UI surfaces a warning banner **and hides the Accept button**, replacing it with "Choose Status Manually".

### Query params for `GET /api/entries/`
- `?status=KEEP|DONATE|SELL|DISCARD`
- `?search=query` (title or author, case-insensitive)
- `?resolved=true|false`
- `?in_collection=true`
- `?page=N` / `?page_size=N` (default 50, max 200) — response is `{count, next, previous, results}`

---

## 4. AI Engine

**File:** `backend/triage/ai_engine.py`

**Critical implementation details:**
```python
# Correct model name (NOT "gemini-2.5-flash-latest" — that 404s)
model = "gemini-2.5-flash"

# Correct instructor mode (NOT Mode.GEMINI_JSON — that's invalid)
# Persistent client initialized at module level in ai_engine.py
client = instructor.from_genai(
    genai.Client(api_key=api_key),
    mode=instructor.Mode.GENAI_STRUCTURED_OUTPUTS,
)

# Open Library API calls in services.py MUST include timeout=10

# Rate limit error handling (NOT google.api_core — that package isn't installed)
from google.genai.errors import ClientError
except ClientError as exc:
    if exc.status_code == 429 and attempt < max_retries - 1:
        time.sleep(2 ** attempt)
    else:
        raise
```

**`jsonref` must be explicitly installed** — it's a transitive dependency of `instructor` that isn't always pinned:
```bash
uv add jsonref
```

---

## 5. Authentication

- **Backend:** `rest_framework.authentication.TokenAuthentication` (default for all endpoints)
- **Frontend:** Token stored in `localStorage` as `'token'`
- **Login:** `POST /api/auth/login/` → `res.data.key` (dj-rest-auth uses `key`, not `token`)
- **Axios interceptor:** Attaches `Authorization: Token <token>` to every request; on 401, clears token and redirects to `/login`
- **Protected routes:** `ProtectedRoute` component in `App.jsx` checks `localStorage.getItem('token')`

Create the initial user with:
```bash
cd backend && uv run python manage.py createsuperuser
```

---

## 6. Frontend Pages

**Nav labels:** The authenticated navbar shows "Scan Books" (route `/scan`) and "Collection" (route `/inventory`). Active route is highlighted via `useLocation`. Authenticated users who visit `/welcome` are redirected to `/`.

### `Dashboard.jsx`
- Hero section shows live `stats.in_collection` count; fallback tagline: "Decide what stays, what sells, and what goes."
- Culling Goal card: `border-warning` when active, `border-danger` with "Set a goal to start" badge when none is set.
- Stats grid: **Pending** row + Resolved row, each card links to Collection with correct filter params
- Links use `?status=KEEP&resolved=false` and `?status=KEEP&resolved=true` patterns

### `TriageWizard.jsx` (Scan Books page)
- **Step 1:** Goal guard + camera scanner. Camera is off by default; user clicks "Start Camera".
- **Step 2:** Book details + AI recommendation card
  - `metadata_found === false` → warning banner
  - `confidence < 0.5` → "AI Uncertain" badge + yellow progress bar
  - Accept pre-fills status and suggested_price. Accept button **hidden** when `is_fallback: true` — only "Choose Status Manually" offered.
  - **Auto-retrigger on condition change:** changing condition grade or flags triggers a fresh AI recommendation (800ms debounce).
- **Step 3:** Confirm and save — "Save & Scan Next" returns to step 1.

**Scanner:** Uses `Html5Qrcode` (not `Html5QrcodeScanner`). `formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13]` only. Do **not** add `aspectRatio` or CSS overrides on `#reader video` — both break decoding.

### `Inventory.jsx` (Collection page)
- View toggles: All / In Collection / Pending / Resolved. Initialized from URL params.
- Paginated: 50 entries/page; "Load More" appends next page.
- Bulk actions: "AI Review", "Change Status (n)". Export to CSV/Excel/PDF.
- **Edit Record Modal:** Edit status, condition, flags, notes, price, donation dest. Shows Market Pricing card (eBay/AbeBooks/BooksRun) above Asking Price when `valuation_data` is present.
- **BulkReviewModal:** `is_resolved` defaults to `false` — user must explicitly opt in.

### `Login.jsx`
- Simple form → `login({username, password})` → navigate to `/` on success.

---

## 7. Key Settings

**`backend/core/settings.py` critical config:**
```python
INSTALLED_APPS = [
    ...,
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "dj_rest_auth",
    "triage",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # MUST be first
    ...
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.TokenAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
}

CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
```

---

## 8. Migration State

10 migrations in `backend/triage/migrations/`:
- `0001_initial` — Book, CatalogEntry
- `0002_...` — cover_url, description fields on Book
- `0003_cullinggoal_catalogentry_ai_recommendation_and_more` — CullingGoal model, ai_recommendation field
- `0004_...` — resolved_at field on CatalogEntry
- `0005_...` — db_index on isbn/title/author/status/resolved_at
- `0006_book_cover_image` — cover_image ImageField on Book
- `0007_book_page_count` — page_count on Book
- `0008_catalogentry_marketplace_description` — marketplace_description on CatalogEntry
- `0009_add_user_to_cullinggoal_and_catalogentry` — user FK (nullable) on CullingGoal and CatalogEntry
- `0010_alter_catalogentry_user_alter_cullinggoal_user` — transitions user FKs to non-nullable; backfills orphaned records to first user.

---

## 9. Dev Commands

**OS Detection (required before issuing any shell commands):**
Run `uname -s` or check the session context. `Darwin` = macOS · `MINGW*`/`MSYS*` = Windows Git Bash. **The shell is bash on both platforms.** Never use PowerShell syntax.
- Windows repo root: `/d/dev/pursuit/book-bounty`
- macOS repo root: wherever the user cloned it — verify with `pwd` if unknown
- Line endings: always LF. Never produce CRLF.
- `node_modules/.bin/*` on Windows: bash shebang wrappers — use `npm run <script>` or `node node_modules/<pkg>/bin/<entry>.js` instead.

```bash
# Backend (from backend/)
uv sync
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py runserver

# Frontend (from frontend/)
npm install
npm run dev

# Lint/format
cd backend && uv run ruff check . --fix
cd frontend && npm run lint          # ESLint (must cd first)
cd frontend && npx prettier --write .
```

---

## 10. Product Scope Notes

- `docs/architecture/VISION.md` and `docs/architecture/AI_SPEC.md` define the current implementation target.
- `docs/roadmap/proposals/v3_VISION.md` is aspirational only.
- This is a **multi-tenant app** where each user manages their own collection and goals. Books (metadata) are shared globally.
- `docs/fellowship/` is the User's personal domain. Never use it as a source for technical architecture or system mandates — reach for `docs/architecture/` and `docs/staff/` first.

---

## 11. Multi-Agent Orchestration
This project uses a multi-agent "staff" model. Full execution details in `docs/staff/directives/GEMINI.md`.

**Session start (mandatory):** Read `docs/staff/directives/GEMINI.md` and `docs/staff/personae/Atlas.md` before any task.

**Consent:** Never commit without explicit User permission.

**Execution model (Gemini-native):**
- Specialists are spawned via `generalist` tool — not implemented inline. Inline implementation bloats the main context window.
- **Parallel waves:** Forge + Prism on non-overlapping files = two `generalist` calls in the same turn.
- **Verification gate:** Sentry + Archivist always invoked in the same turn (always parallel, never sequential).
- **3-file atomicity:** No sub-agent task exceeds 3 files. Component creation is decoupled from page integration.

**Specialist roster** (persona files in `docs/staff/personae/`):
| Persona | Domain | Fires when... |
|---|---|---|
| Forge | Django backend, DRF, migrations | Any backend change |
| Prism | React frontend, components, routing | Any frontend change |
| Nova | Gemini AI, Pydantic schemas | Any AI engine change |
| Sentry | QA audit — tests, lint, regressions | After every implementation wave |
| Ember | Security — IDOR, permissions, data isolation | After auth/permission/data-model changes |
| Scout | DevOps — render.yaml, env vars, SPA routing | Before releases; when config files change |
| Archivist | Documentation sync — REFLECTION.md, GEMINI.md, CLAUDE.md | After every session (parallel with Sentry) |
| Narrator | Narrative, marketing, research, strategy | Brand, marketing, or research tasks |

---

## 12. Backend Performance

- **Database Indexing:** `Book.isbn`, `Book.title`, `Book.author`, `CatalogEntry.status`, `CatalogEntry.resolved_at` are indexed via `db_index=True`.
- **Query Optimization:**
  - `CatalogEntryViewSet` uses `.select_related('book')` to eliminate N+1 query overhead.
  - `DashboardStatsView` uses a single `.aggregate()` query with conditional `Count(Q(...))` filters — one DB roundtrip.

---

## 13. Code Quality

- **Senior Dev Audit (April 2026):** Monolithic components decomposed, ORM queries optimized, API resilience improved.
- **Testing:** Always run `uv run python manage.py test` before pushing. API tests require `BaseAPITestCase` for authenticated context.
- **ruff.toml** codifies pre-existing violations — not all ruff output is actionable. Check ruff.toml before treating a violation as a new regression.

---

## 14. Project Status
- **Phase 1 through Phase 10:** Completed.
- **Multi-Tenant Refactor:** Complete. `user` FK on `CullingGoal` and `CatalogEntry`; all 7 API surfaces scoped to `request.user`; self-service registration at `POST /api/auth/register/`; React `/register` Sign Up page.
- **Completed Specs:** See `docs/roadmap/completed/` for implementation details of past phases.

---

## 15. Deployment Notes (Render)
- **Frontend:** Static site (`runtime: static`). Render does NOT auto-serve `index.html` for unknown paths.
- **SPA Routing Fix:** `render.yaml` routes rewrite block is authoritative. `frontend/public/_redirects` is a belt-and-suspenders fallback — not sufficient on its own.
- **Public routes:** `/welcome` and `/login` are unauthenticated. All other routes are behind `ProtectedRoute`.
- **DEPLOYMENT.md has been wrong before** — always verify deployment behavior against live `render.yaml`, not documentation.
