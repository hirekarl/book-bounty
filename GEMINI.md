# BookBounty: Project Context & Instructions

**BookBounty** is a single-user web application for cataloging personal book collections and managing their lifecycle (Keep, Donate, Sell, or Discard).

---

## 1. Project Overview

### Architecture
- **Monorepo Structure:**
    - `backend/`: Django 6.x REST API.
    - `frontend/`: React 18+ (Vite) single-page application.
- **Core Technologies:**
    - **Backend:** Python 3.12+, Django 6.x, Django REST Framework (DRF), `uv` (package manager), SQLite.
    - **Frontend:** React 19, Vite, React Bootstrap (Bootstrap 5), Axios, React Router 7.
- **Auth:** `dj-rest-auth` + `rest_framework.authtoken` (token auth). Login via `POST /api/auth/login/` returns `{"key": "..."}`.
- **Integrations:**
    - **Open Library API:** Used for fetching book metadata via ISBN.
    - **Barcode Scanning:** `html5-qrcode` for camera-based ISBN scanning.
    - **Exports:** `exceljs` (Excel), `jspdf` (PDF), and CSV support.

### Branding & UI
- **Brand Icon:** `bi-bookmark-star-fill` (Bootstrap Icons).
- **Style:** Modern, clean, and efficiency-focused using `react-bootstrap` primitives.
- **Color Logic:** Success (Keep), Info (Donate), Primary (Sell), Danger (Discard).

### AI Engine (v2)
- **Model:** Gemini 2.5 Flash (`gemini-2.5-flash`) via `google-genai` SDK.
- **Structured Output:** `instructor` library enforces Pydantic-validated responses.
- **Core Flow:** User sets a Culling Goal → scans a book → AI recommends a triage outcome (KEEP/DONATE/SELL/DISCARD) with confidence score and reasoning → user accepts or overrides.
- **Key Endpoint:** `POST /api/recommend/` — accepts `isbn`, optional `culling_goal_id`, `condition_grade`, `condition_flags`.

---

## 2. Development Standards

### Backend (Python/Django)
- **Docstrings:** Use **Google-style docstrings** for all modules, classes, and functions.
- **Typing:** Strict type hinting is enforced via `mypy`.
- **Linting & Formatting:** Managed by `ruff`.
- **Testing:** Unit tests using Django's `TestCase`. Run with `uv run python manage.py test`. Base class `BaseAPITestCase` in `test_api.py` handles token auth setup.

### Frontend (React/JS)
- **Component Pattern:** Use `react-bootstrap` components (Container, Row, Col, Card, etc.) instead of raw HTML/CSS.
- **Linting & Formatting:** Managed by `ESLint` and `Prettier`.
- **Routing:** React Router DOM for navigation.

### OS & Shell Handling
- **Environment Detection:** At the start of every session, verify the operating system.
- **Windows:** Use **PowerShell** commands (e.g., `;` as a separator instead of `&&`).
- **Linux/macOS:** Use **bash** commands.
- This prevents tool failures caused by cross-platform command syntax mismatches.

---

## 3. Key Commands

### Backend Operations (from `backend/`)
- **Install Dependencies:** `uv sync`
- **Run Server:** `uv run python manage.py runserver`
- **Run Tests:** `uv run python manage.py test`
- **Linting (Check):** `uv run ruff check .`
- **Linting (Fix):** `uv run ruff check . --fix`
- **Type Checking:** `uv run mypy .`
- **Migrations:** `uv run python manage.py makemigrations` and `uv run python manage.py migrate`

### Frontend Operations (from `frontend/`)
- **Install Dependencies:** `npm install`
- **Run Dev Server:** `npm run dev`
- **Build for Production:** `npm run build`
- **Linting:** `npm run lint`
- **Format:** `npx prettier --write .`

---

## 4. Environment Configuration
Reference `.env.example` in the root or within subdirectories for required variables:
- `SECRET_KEY`: Django secret key.
- `OPEN_LIBRARY_CONTACT`: Email for Open Library API headers.
- `GEMINI_API_KEY`: API key for Gemini 2.5 Flash. Required for AI recommendations. Get one at https://aistudio.google.com/app/apikey.
- `VITE_API_BASE_URL`: URL of the backend API.

---

## 5. Directory Structure
- `backend/triage/`: Main logic for book metadata, catalog entries, and decision engine.
  - `ai_engine.py`: Gemini 2.5 Flash integration. Contains `get_ai_recommendation()` and the `TriageRecommendation` Pydantic schema. Uses a persistent `instructor` client for efficiency.
  - `models.py`: `Book`, `CatalogEntry` (with `resolved_at`), `CullingGoal`.
  - `views.py`: `BookLookupView`, `CatalogEntryViewSet` (uses `select_related('book')`), `CullingGoalViewSet`, `RecommendView`, `DashboardStatsView`.
  - `serializers.py`: DRF serializers for all models. `CatalogEntrySerializer` marks `resolved_at` as read-only.
  - `services.py`: Open Library API client and book caching. Includes 10s timeout on API calls.
- `backend/core/`: Django project configuration and settings.
- `frontend/src/`: React source code, components, and assets.
  - `components/common/`: Shared UI components like `Badge.jsx` (StatusBadge, ConditionBadge).
  - `pages/Login.jsx`: Token auth login form.
  - `pages/Dashboard.jsx`: Stats overview (active + resolved), Culling Goal management.
  - `pages/TriageWizard.jsx`: Main triage container. Refactored into sub-components in `pages/TriageWizard/`.
    - `RecommendationCard.jsx`: AI suggestion display and accept/override logic.
    - `ConditionForm.jsx`: Physical condition entry and pricing/notes.
  - `pages/Inventory.jsx`: Filterable catalog table with view toggles, resolution, and exports.
  - `pages/Inventory/`:
    - `EditRecordModal.jsx`: Standalone modal component for advanced record management.
    - **Capabilities:** Modify status, condition grade, condition flags, notes, price, and destination. Validates `asking_price` on save.
    - **Lifecycle:** Toggle "Resolved" state (allows un-resolving) and "Delete Record" support.
  - `services/api.js`: Axios API client with token interceptor and 401 redirect. Includes `updateCatalogEntry` (PATCH) and `deleteCatalogEntry` (DELETE).
- `docs/`:
  - `CODE_REVIEW.md`: Senior Dev audit findings.
  - `REMEDIATION_PLAN.md`: Strategic plan for fixing identified issues.
  - `REMEDIATION_REPORT.md`: Final summary of performance and security improvements.
  - `legacy/`: Archived planning documents.
- `v2_PRODUCT_VISION.md`: Current product vision (AI-driven culling).
- `v2_AI_ENGINE_SPEC.md`: Technical spec for the AI engine.
- `v3_PRODUCT_VISION.md`: Aspirational B2B institutional marketplace — does NOT inform current implementation.
- `CLAUDE.md`: Project context file for Claude Code sessions.
ion.
- `CLAUDE.md`: Project context file for Claude Code sessions.
