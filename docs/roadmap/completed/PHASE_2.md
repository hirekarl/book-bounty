# Phase 2: V2 Architecture

> *Reconstructed from commit history. Phase 2 predates the multi-agent model and formal spec documents.*

## Objective

Rearchitect the application from a rule-based prototype to a fully-featured AI-powered triage tool: real Gemini AI recommendations, token authentication, user-defined culling goals, and a complete resolution lifecycle.

---

## Scope

### AI Engine (`ai_engine.py`)
- Integrate Gemini 2.5 Flash via `google-genai` SDK and `instructor` library
- Use `instructor.Mode.GENAI_STRUCTURED_OUTPUTS` for typed Pydantic output
- `TriageRecommendation` schema: `status`, `confidence`, `reasoning`, `suggested_price`, `suggested_donation_dest`, `notable_tags`
- Goal description fed verbatim into the prompt as culling context

### Authentication
- Add `dj-rest-auth` + `rest_framework.authtoken` for token-based auth
- All API endpoints require `Authorization: Token <token>` header
- Frontend: `Login.jsx` page, token stored in `localStorage`, Axios interceptor on 401

### CullingGoal Model
- New `CullingGoal` model: `name`, `description`, `is_active`, `created_at`
- Single-active enforcement: setting one goal active deactivates all others
- Preset templates surfaced in the Dashboard goal card
- Goal guard in Triage Wizard — blocks scanning if no active goal is set

### Resolution Lifecycle
- Added `resolved_at` (nullable timestamp) to `CatalogEntry`
- `POST /api/entries/{id}/resolve/` — stamps `resolved_at = now()`
- "In Collection" definition: `resolved_at IS NULL` OR (`resolved_at IS NOT NULL` AND `status = KEEP`)
- Dashboard stats split into Active and Resolved rows

### Inventory Enhancements
- View toggles: All / In Collection / Pending / Resolved
- URL-driven filter params — Dashboard stat cards link directly to filtered Inventory views
- Bulk status change (`PATCH /api/entries/bulk_update_status/`)

### UX Additions (pre-v2 intermediate work)
- Condition grading and pricing helpers (eBay/Amazon reference links)
- Cover images surfaced in Triage Wizard
- Book `cover_url` and `description` fields added to model

### Scanner: React Strict Mode Fix
- React 18 Strict Mode fires cleanup twice in development, causing "scanner not running" errors
- Fix: `setTimeout(() => ..., 0)` defers scanner init past Strict Mode's second mount; cancellation flag prevents double-start

---

## Key Commits

| Hash | Description |
|------|-------------|
| `7c3533c` | UX improvements and database refinements (condition grading, cover images, bulk status) |
| `abbe3a1` | Refine v2 spec; imagine v3 |
| `8eeca43` | Implement v2 engine specs; draft v2 README |
| `1c12252` | Close v2 spec gaps — metadata flag, goal guard, goal context |
| `08b9d63` | Implement v2 AI engine, auth, resolution lifecycle, and culling goals |
| `acce976` | Update README, AI spec, and GEMINI.md to reflect current app state |

---

## Post-Mortem

- **Status:** Complete
- **Scope creep:** Scanner UX and cover images were added mid-phase as the Triage Wizard was being reworked — not originally in scope but natural to bundle.
- **CLAUDE.md introduced:** First project context document created in this phase to support future AI-assisted sessions.
- **Notable gap:** Scanner reliability issues surfaced immediately after launch — the high-level `Html5QrcodeScanner` component had layout and format-restriction limitations. Fully addressed in Phase 3.
- **Notable gap:** No form validation on the frontend — invalid inputs could be submitted silently. Addressed in Phase 3.2.
