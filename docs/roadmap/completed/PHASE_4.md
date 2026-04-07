# Phase 4: Bulk Triage Wizard

> *Reconstructed from commit history. Phase 4 was the first phase executed fully under the multi-agent staff model.*

## Objective

Enable comparative batch triage — let users select multiple unresolved entries from Inventory and get a single AI recommendation pass that evaluates all books together, anchoring decisions to the stated culling goal.

---

## Technical Contract

- **New endpoint:** `POST /api/recommend/bulk/` — accepts a list of entry IDs, returns one `TriageRecommendation` per entry
- **AI strategy:** Single prompt containing all books in the batch; AI reasons comparatively (e.g., "given your goal of reducing by 50%, keep the rarer titles and discard duplicates")
- **Frontend surface:** Multi-select checkboxes in `Inventory.jsx`; `BulkReviewModal.jsx` for reviewing and accepting/overriding per-entry recommendations

---

## Sub-Tasks

### Backend (Forge)
- [x] **A1:** Add `RecommendBulkView` at `POST /api/recommend/bulk/` — validates entry IDs, fetches book metadata and active goal, delegates to `get_bulk_ai_recommendation()`
- [x] **A2:** Implement `get_bulk_ai_recommendation()` in `ai_engine.py` — comparative prompt engineering: all books listed with metadata and condition, single AI call, structured output is a list of `TriageRecommendation` objects keyed by entry ID
- [x] **A3:** Fix Pydantic Enum serialization issue discovered during QA — bulk response was not correctly serializing status Enum values to strings

### Frontend (Prism)
- [x] **B1:** Add multi-select checkboxes to `Inventory.jsx` table rows; track selected entry IDs in state
- [x] **B2:** Create `BulkReviewModal.jsx` — displays all selected books side-by-side with AI recommendations; per-entry Accept / Override controls; "Save All" commits all decisions in a single pass
- [x] **B3:** Wire "Bulk Triage" toolbar action to open `BulkReviewModal` with selected entries

### Quality (Sentry)
- [x] **C1:** Audit implementation — `manage.py test`, ruff, lint, Prettier
- [x] **C2:** ARIA accessibility pass on `BulkReviewModal` (role, aria-label attributes)

---

## Key Commits

| Hash | Description |
|------|-------------|
| `d15b3e0` | Implement comparative Bulk Triage Wizard (Phase 4) |
| `584f932` | Fix Triage Wizard submission, book cover, and linting issues (Phase 4 final) |
| `054e1b1` | Prioritize remote `cover_url` in Triage Wizard for immediate feedback |

---

## Post-Mortem

- **Status:** Complete
- **Friction:** Pydantic Enum serialization — the bulk AI response returned Python Enum members rather than string values, causing serialization errors when saving. Fixed by explicit `.value` extraction in the response handler.
- **Friction:** Cover image priority logic — Triage Wizard was preferring the locally-cached `cover_image` (which may not yet exist on a first scan) over the `cover_url` returned immediately by the Open Library lookup. Fixed with explicit priority: `cover_url` first on Step 2 display.
- **Notable:** First phase to include comparative AI reasoning — the bulk prompt gives the model all books simultaneously so it can reason about relative value, not just each book in isolation.
