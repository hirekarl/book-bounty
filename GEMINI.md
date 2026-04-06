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
- **Integrations:**
    - **Open Library API:** Used for fetching book metadata via ISBN.
    - **Barcode Scanning:** `html5-qrcode` for camera-based ISBN scanning.
    - **Exports:** `exceljs` (Excel), `jspdf` (PDF), and CSV support.

### Branding & UI
- **Brand Icon:** `bi-bookmark-star-fill` (Bootstrap Icons).
- **Style:** Modern, clean, and efficiency-focused using `react-bootstrap` primitives.
- **Color Logic:** Success (Keep), Info (Donate), Primary (Sell), Danger (Discard).

### AI Engine (v2)
- **Model:** Gemini 2.5 Flash (`gemini-2.5-flash-latest`) via `google-genai` SDK.
- **Structured Output:** `instructor` library enforces Pydantic-validated responses.
- **Core Flow:** User sets a Culling Goal → scans a book → AI recommends a triage outcome (KEEP/DONATE/SELL/DISCARD) with confidence score and reasoning → user accepts or overrides.
- **Key Endpoint:** `POST /api/recommend/` — accepts `isbn`, optional `culling_goal_id`, `condition_grade`, `condition_flags`.

---

## 2. Development Standards

### Backend (Python/Django)
- **Docstrings:** Use **Google-style docstrings** for all modules, classes, and functions.
- **Typing:** Strict type hinting is enforced via `mypy`.
- **Linting & Formatting:** Managed by `ruff`.
- **Testing:** Unit tests using Django's `TestCase`. Run with `uv run python manage.py test`.

### Frontend (React/JS)
- **Component Pattern:** Use `react-bootstrap` components (Container, Row, Col, Card, etc.) instead of raw HTML/CSS.
- **Linting & Formatting:** Managed by `ESLint` and `Prettier`.
- **Routing:** React Router DOM for navigation.

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
  - `ai_engine.py`: Gemini 2.5 Flash integration. Contains `get_ai_recommendation()` and the `TriageRecommendation` Pydantic schema.
  - `models.py`: `Book`, `CatalogEntry`, `CullingGoal`.
  - `views.py`: `BookLookupView`, `CatalogEntryViewSet`, `CullingGoalViewSet`, `RecommendView`, `DashboardStatsView`.
- `backend/core/`: Django project configuration and settings.
- `frontend/src/`: React source code, components, and assets.
  - `pages/Dashboard.jsx`: Stats overview and active Culling Goal management.
  - `pages/TriageWizard.jsx`: Scan → AI recommend → accept/override → save flow.
  - `pages/Inventory.jsx`: Filterable, exportable catalog entry table.
  - `services/api.js`: Axios API client for all backend calls.
- `docs/legacy/`: Archived planning documents.
- `v2_PRODUCT_VISION.md`: Current product vision (AI-driven culling).
- `v2_AI_ENGINE_SPEC.md`: Technical spec for the AI engine.
