# Phase 1: Core Foundation

> *Reconstructed from commit history. Phase 1 predates the multi-agent model and formal spec documents.*

## Objective

Build the full-stack MVP: a working Django + React application that lets a user scan a book by ISBN, get a triage suggestion based on physical condition, and track outcomes in an inventory view.

---

## Scope

### Backend
- **Models:** `Book` (ISBN, title, author, publish_year, subjects, cover_url, description) and `CatalogEntry` (FK to Book, status, condition_grade, condition_flags, notes, asking_price, donation_dest)
- **Services:** `fetch_book_metadata()` — Open Library API lookup by ISBN; `get_or_create_book()` — cache-on-first-scan pattern; `suggest_triage_outcome()` — rule-based: DISCARD if any condition flags present, else KEEP
- **API:** REST endpoints for book lookup (`/lookup/{isbn}/`), catalog entry CRUD (`/entries/`), dashboard stats (`/stats/`), and bulk status update
- **Tests:** 16 unit and integration tests covering models, services, and API endpoints

### Frontend
- **Dashboard:** In-collection count, stats grid (active/resolved per status), culling goal card
- **Triage Wizard:** Step-based flow — scan ISBN via html5-qrcode, display book metadata + AI suggestion, accept or override, save entry
- **Inventory:** Table view of all entries; resolve action; CSV, Excel, and PDF exports
- **Scanner:** `html5-qrcode` EAN-13 barcode decoder integrated into Step 1 of the wizard

---

## Key Commits

| Hash | Description |
|------|-------------|
| `25b4542` | Initialize BookBounty monorepo with Django and React |
| `11343b5` | Implement Book and CatalogEntry models with unit tests |
| `4c3e7a2` | Implement core services (fetch_book_metadata, get_or_create_book, suggest_triage_outcome) |
| `b2963c8` | Establish serializers, views, and URLs for the triage app |
| `a374e2b` | Complete BookBounty implementation (Dashboard, Triage Wizard, Inventory, exports) |

---

## Post-Mortem

- **Status:** Complete
- **AI strategy at this phase:** Rule-based only — `suggest_triage_outcome()` returned DISCARD if any condition flags were present, KEEP otherwise. No LLM involved.
- **Scanner:** Initial implementation used `Html5QrcodeScanner` (the high-level library component). Later replaced in Phase 3.
- **Notable gap:** No authentication — the app was fully open. Addressed in Phase 2.
- **Notable gap:** No user-defined culling goals — triage was purely condition-based. Addressed in Phase 2.
