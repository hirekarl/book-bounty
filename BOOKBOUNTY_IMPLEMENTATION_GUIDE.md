# Technical Specification: BookBounty

**Date:** 2026-04-06  
**Project Goal:** A single-user web application for cataloging a personal book collection and deciding the fate of each book: **Keep**, **Donate**, **Sell**, or **Discard**.
**Slogan:** *Turn your library into a garage sale goldmine.*

---

## 1. System Overview

**BookBounty** is a monorepo consisting of a **Django (REST Framework)** backend and a **React (Vite/Bootstrap)** frontend. It allows users to scan ISBN barcodes using their device's camera, fetch book metadata automatically from the Open Library API, and walk through a "triage wizard" to assign a status and additional metadata (notes, price, donation destination) to each book.

### Brand Identity
- **Name:** BookBounty
- **Brand Icon:** **`bi-bookmark-star-fill`** (Bootstrap Icon).
- **Visual Style:** Modern, clean, and efficiency-focused. 
- **Icon Usage:** The brand icon must be used consistently in the **Favicon**, the **Navbar Brand** section (left of the name), and on the **Dashboard** welcome card.
- **Color Palette:** Utilizes standard Bootstrap semantic colors (Success for Keep, Info for Donate, Primary for Sell, Danger for Discard) to provide immediate visual feedback.
- **UI Philosophy:** Strict adherence to **Bootstrap 5 idioms** using the `react-bootstrap` library for a "native web" feel that is responsive and familiar.

---

## 2. Technical Stack & Monorepo Setup

The project uses a monorepo structure with `backend/` and `frontend/` directories.

### Backend: Django 6.x
- **Language:** Python 3.12+
- **Package Manager:** `uv`
- **Framework:** Django 6.0.3+ with Django REST Framework (DRF)
- **Database:** SQLite (Default for personal/local use)
- **Linting/Types:** `ruff` for linting/formatting, `mypy` for static type checking.

#### Backend Dependencies (`pyproject.toml`)
```toml
[project]
name = "bookbounty-backend"
dependencies = [
    "django>=6.0.3",
    "django-cors-headers>=4.9.0",
    "djangorestframework>=3.17.1",
    "python-dotenv>=1.2.2",
    "requests>=2.33.1",
]

[dependency-groups]
dev = [
    "ruff>=0.9.0",
    "mypy>=1.14.0",
    "django-stubs[compatible-mypy]>=5.1.1",
    "djangorestframework-stubs[compatible-mypy]>=3.15.2",
    "types-requests>=2.32.0",
    "coverage>=7.0",
]
```

### Frontend: React 18
- **Build Tool:** Vite
- **UI Library:** **React Bootstrap 2 (Bootstrap 5)**. All components must use `react-bootstrap` primitives (Container, Row, Col, Button, Card, etc.) rather than raw HTML or custom CSS where possible.
- **Icons:** Bootstrap Icons (`bootstrap-icons`)
- **HTTP Client:** Axios
- **Routing:** React Router DOM v6
- **Specialized Libs:** `html5-qrcode` (Scanning), `exceljs` (Excel), `jspdf` + `jspdf-autotable` (PDF).

#### Frontend Dependencies (`package.json`)
```json
{
  "name": "bookbounty-frontend",
  "dependencies": {
    "axios": "^1.6.7",
    "bootstrap": "^5.3.2",
    "bootstrap-icons": "^1.13.1",
    "exceljs": "^4.4.0",
    "html5-qrcode": "^2.3.8",
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.7",
    "react": "^18.2.0",
    "react-bootstrap": "^2.10.1",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.59.1",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.4",
    "prettier": "^3.8.1",
    "vite": "^8.0.3"
  }
}
```

---

## 3. Data Model

### Book
Stores immutable metadata for a book, keyed by ISBN.
- `isbn`: String (unique, optional for manual entries)
- `title`: String
- `author`: String
- `publish_year`: Integer
- `subjects`: JSON/List
- `created_at`: DateTime

### CatalogEntry
Records the user's decision and specific details for a physical copy.
- `book`: ForeignKey to Book
- `status`: Choice (KEEP, DONATE, SELL, DISCARD)
- `condition_flags`: JSON List (e.g., ["DAMAGED_COVER", "MISSING_PAGES"])
- `notes`: Text
- `asking_price`: Decimal (Only for SELL)
- `donation_dest`: String (Only for DONATE)
- `created_at / updated_at`: DateTime

---

## 4. Business Logic & Triage Workflow

### Triage Outcomes
| Status | Label | Bootstrap Variant | Logic |
|---|---|---|---|
| **KEEP** | Keep | `success` | User choice. |
| **DONATE** | Donate | `info` | User choice. |
| **SELL** | Sell | `primary` | User choice; requires `asking_price`. |
| **DISCARD** | Discard | `danger` | Suggested if `condition_flags` are set. |

### Decision Engine (`services.py`)
1. **Metadata Fetch:** When an ISBN is scanned, the backend checks the local `Book` table. If missing, it fetches from Open Library and caches the result.
2. **Suggested Outcome:** If the user selects any physical condition flags (e.g., "Water Damage"), the app auto-suggests **DISCARD**. The user can override this suggestion to pick any of the other four statuses.

---

## 5. API Endpoints

- `GET /api/lookup/<isbn>/`: Fetch book details (local or API).
- `GET /api/entries/`: List all catalog entries (supports filtering by status/search).
- `POST /api/entries/`: Create a new triage record.
- `GET /api/stats/`: Dashboard statistics (counts by status).

---

## 6. Frontend Routes & UI Components

### Theme & Layout
All layouts must use `react-bootstrap`'s `Container`, `Row`, and `Col` for responsiveness. Cards (`Card`) should be used for grouping information.

- `/`: **Dashboard** — Summary cards using `variant` colors for counts and a primary "Start Scanning" button. **Include the brand icon (`bi-bookmark-star-fill`) prominently in a hero section.**
- `/scan`: **Triage Wizard** —
    1. **Scan Step:** Barcode scanner (`Html5QrcodeScanner`) or manual ISBN entry via `Form`.
    2. **Metadata Step:** Confirm title/author and toggle condition flags using `Form.Check`.
    3. **Decision Step:** Select Status via `ButtonGroup` or large `Button` cards. Show price/destination inputs contextually. Add notes.
    4. **Outcome Step:** Final confirmation using an `Alert` or success `Card`.
- `/collection`: **Inventory** — `Table` (striped, bordered, hover) of all books with `Nav` or `Dropdown` filters for status.
- `/history`: **Timeline** — Chronological log of triage actions using `ListGroup`.

### Navigation
The `Navbar` component must:
- Feature the `bi-bookmark-star-fill` icon and the "BookBounty" name in the `Navbar.Brand`.
- Be `sticky="top"` with a dark or light theme (user choice, default dark).

---

## 7. Setup Instructions for Implementation

1. **Initialize Monorepo:** Create `backend/` and `frontend/` folders.
2. **Git Configuration:** Initialize the git repository and set the root `.gitignore` using the standardized content from:  
   `https://www.toptal.com/developers/gitignore/api/windows,macos,django,react,node,python`
3. **Backend Setup:**
    - Initialize `uv` project.
    - Install Django, DRF, and dev dependencies.
    - Configure `settings.py` for SQLite and CORS.
    - Create `triage` app with `Book` and `CatalogEntry` models.
4. **Frontend Setup:**
    - Initialize Vite with React.
    - Install `react-bootstrap`, `bootstrap`, `bootstrap-icons`, Axios, and scanning/export libraries.
    - **Import Bootstrap CSS and Icons** in `main.jsx`.
    - Configure `vite.config.js`.
5. **Environment:**
    - Create `.env` files for `SECRET_KEY` and `OPEN_LIBRARY_CONTACT` email.
