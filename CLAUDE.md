# BookBounty: Claude Code Context

**BookBounty** is a single-user AI-powered personal library triage web app. Users scan books by ISBN, get an AI recommendation (KEEP/DONATE/SELL/DISCARD) based on their stated culling goal, and track outcomes over time.

---

## 1. Architecture

```
book-bounty/
├── backend/           # Django 6.x + DRF REST API
│   ├── core/          # settings.py, urls.py
│   └── triage/        # main app: models, views, serializers, ai_engine
├── frontend/          # React 19 + Vite SPA
│   └── src/
│       ├── components/ 
│       │   ├── common/ # Badge.jsx (StatusBadge, ConditionBadge)
│       │   └── Layout.jsx
│       └── pages/     # Dashboard, Inventory, Login, TriageWizard.jsx
│           ├── Inventory/ # EditRecordModal
│           └── TriageWizard/ # RecommendationCard, ConditionForm
│       └── services/  # api.js (Axios client)
├── v2_PRODUCT_VISION.md   # current product vision (AI culling)
├── v2_AI_ENGINE_SPEC.md   # AI engine technical spec
├── v3_PRODUCT_VISION.md   # aspirational B2B institutional marketplace (does NOT inform current impl)
├── GEMINI.md              # context file for Gemini CLI
└── CLAUDE.md              # this file
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
- `name`, `description`, `is_active` (only one active at a time), `created_at`

### `CatalogEntry`
One physical copy of a book with a triage decision.
- `book` (FK), `culling_goal` (FK, nullable), `status` (KEEP/DONATE/SELL/DISCARD)
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
| GET | `lookup/{isbn}/` | Fetch/cache book metadata; includes `metadata_found` flag |
| GET/POST/PATCH | `entries/` | List (with filters) / create / update catalog entries |
| DELETE | `entries/{id}/` | Delete a catalog entry record |
| POST | `entries/{id}/resolve/` | Stamp `resolved_at = now()` (idempotent guard: 400 if already resolved) |
| PATCH | `entries/bulk_update_status/` | `{"ids": [...], "status": "SELL"}` |
| GET | `stats/` | Dashboard counts: `{active: {...}, resolved: {...}, in_collection: N}` |
| GET/POST/PATCH | `goals/` | CRUD for culling goals |
| POST | `recommend/` | AI recommendation — see below |

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
  "action": "KEEP",
  "confidence": 0.85,
  "reasoning": "...",
  "suggested_price": null,
  "suggested_donation_dest": null
}
```

### Query params for `GET /api/entries/`
- `?status=KEEP|DONATE|SELL|DISCARD`
- `?search=query` (title or author, case-insensitive)
- `?resolved=true|false`
- `?in_collection=true`

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

### `Dashboard.jsx`
- Hero section shows live `stats.in_collection` count
- Culling Goal card: active goal display, Change (list inactive goals), New Goal form with preset templates
- Stats grid: Active Decisions row + Resolved row, each card links to Inventory with correct filter params
- Links use `?status=KEEP&resolved=false` and `?status=KEEP&resolved=true` patterns

### `TriageWizard.jsx` (Scan page)
- **Step 1:** Goal guard — blocks if no active culling goal; shows GoalPill + camera scanner
- **Step 2:** Book details + AI recommendation card
  - `metadata_found === false` → shows warning banner
  - `confidence < 0.5` → "AI Uncertain" badge + yellow progress bar
  - Accept: pre-fills status and suggested_price; Override: shows manual status picker
- **Step 3:** Confirm and save — creates CatalogEntry, returns to step 1 for next scan

**Scanner implementation** — uses lower-level `Html5Qrcode` (not `Html5QrcodeScanner`) for full layout control. Key design decisions:

- `cameraEnabled` state (default `false`) — camera is **off by default**; user clicks "Start Camera". Toggling it triggers effect cleanup/restart cleanly.
- `formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13]` — restricts decoder to EAN-13 only. Book barcodes have a main EAN-13 (ISBN) and a smaller EAN-5 add-on beside it; without this restriction the scanner locks onto the wrong one.
- `{ fps: 10, qrbox: 250 }` — library defaults; do not use `aspectRatio` or custom CSS on the video element, as both break the library's internal coordinate system and prevent decoding.
- Post-start `applyConstraints` bumps resolution to 1080p (default is 640×480, too low for reliable EAN-13 decoding) and requests `focusMode: continuous`. Both are best-effort and silently ignored if unsupported.
- `startPromise` pattern prevents "scanner is not running" errors when React Strict Mode cleanup fires before `start()` resolves — cleanup chains `stop()` off the promise rather than calling it immediately.

```js
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// state: const [cameraEnabled, setCameraEnabled] = useState(false);

useEffect(() => {
  if (step !== 1 || !activeGoal || !cameraEnabled) return;
  let qr = null;
  let cancelled = false;
  let startPromise = null;
  const timer = setTimeout(() => {
    if (cancelled) return;
    document.getElementById('reader').innerHTML = '';
    qr = new Html5Qrcode('reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
    });
    startPromise = qr
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          if (cancelled) return;
          const instance = qr; qr = null;
          instance.stop().catch(() => {});
          handleLookup(decodedText);
        },
        () => {},
      )
      .then(() => {
        if (cancelled) return;
        const track = document.querySelector('#reader video')?.srcObject?.getVideoTracks?.()[0];
        track?.applyConstraints({
          width: { ideal: 1920 }, height: { ideal: 1080 },
          advanced: [{ focusMode: 'continuous' }],
        }).catch(() => {});
      })
      .catch((err) => {
        if (!cancelled) setLookupError(`Camera error: ${err?.message || err}`);
        qr = null;
      });
  }, 0);
  return () => {
    cancelled = true;
    clearTimeout(timer);
    if (qr) {
      const instance = qr; qr = null;
      (startPromise || Promise.resolve()).then(() => instance.stop().catch(() => {}));
    }
  };
}, [step, activeGoal, cameraEnabled]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Do not** add `experimentalFeatures`, `aspectRatio`, or CSS overrides on `#reader video` — all three have been tried and break scanning.

### `Inventory.jsx`
- View toggles: All / In Collection / Pending / Resolved
- Initialized from URL params (Dashboard links pass `?status=...&resolved=...`)
- Resolved rows styled with `text-muted`, `opacity-50` cover image, secondary "Kept · date" badge
- Action column: "Resolve" button OR "Done" badge, plus a pencil icon for editing
- **Edit Record Modal:**
  - Triggered by clicking the book title (accessible via keyboard/role) or pencil icon.
  - Allows editing of status, condition, flags, notes, price, and donation destination.
  - Supports toggling resolution state (un-resolve) and record deletion.
- Bulk status change, export to CSV/Excel/PDF

### `Login.jsx`
- Simple form → `login({username, password})` → navigate to `/` on success

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

4 migrations in `backend/triage/migrations/`:
- `0001_initial` — Book, CatalogEntry
- `0002_...` — cover_url, description fields on Book
- `0003_cullinggoal_catalogentry_ai_recommendation_and_more` — CullingGoal model, ai_recommendation field
- `0004_...` — resolved_at field on CatalogEntry

---

## 9. Dev Commands

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
cd frontend && npx prettier --write .
```

---

## 10. Product Scope Notes

- **v2_PRODUCT_VISION.md** and **v2_AI_ENGINE_SPEC.md** define the current implementation target.
- **v3_PRODUCT_VISION.md** is aspirational only (B2B institutional acquisition marketplace). It does NOT inform any current implementation decisions.
- This is a **single-user app** — no multi-tenancy, no sharing. One Django user per install.

---

## 12. Backend Performance

- **Database Indexing:** Fields used frequently for filtering and lookup (`Book.isbn`, `Book.title`, `Book.author`, `CatalogEntry.status`, `CatalogEntry.resolved_at`) are indexed via `db_index=True`.
- **Query Optimization:** 
  - `CatalogEntryViewSet` uses `.select_related('book')` to eliminate N+1 query overhead.
  - `DashboardStatsView` uses a single `.aggregate()` query with conditional `Count(Q(...))` filters to calculate all dashboard metrics in one database roundtrip.

---

## 13. Code Quality

- **Senior Dev Audit (April 2026):** Codebase underwent a comprehensive stability and performance audit.
- **Remediation:** Monolithic components were decomposed, ORM queries optimized, and API resilience improved with timeouts and shared clients.
- **Testing:** Always run `uv run python manage.py test` before pushing changes. API tests require `BaseAPITestCase` for authenticated context.
