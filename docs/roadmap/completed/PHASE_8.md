# Phase 8 Implementation Plan: Valuation Intelligence

## Objective

Activate the dormant `valuation_data` JSON field on `CatalogEntry` by integrating real market pricing data from two sources. Feed that data into the AI recommendation loop so SELL recommendations and asking prices are grounded in actual market comparables rather than AI intuition alone.

## Research Basis

April 2026 pricing API research spike. Full findings in `docs/staff/REFLECTION.md`.

**Two-source strategy:**
- **eBay Browse API** — active used listing price range (min/max). Free, JSON, OAuth client credentials (app token — no user login). Register at developer.ebay.com.
- **AbeBooks Search Web Services** — used listing price range (low/median/high from real seller listings). Free, affiliate registration required. XML response. *Note: AbeBooks affiliate registration pending confirmation — if blocked, eBay becomes sole source.*
- **BooksRun API** — condition-sensitive buyback price (what a vendor will pay). Contact for API key. If key obtained before Wave A, include as `buyback_price` in `valuation_data`.

**Eliminated:** BookScouter (no API), Bookfinder (no API), ISBNdb Pro ($100/mo, opaque), Google Books (new/digital only), Open Library (no pricing data).

---

## Data Contract

`CatalogEntry.valuation_data` (JSON) shape after this phase:

```json
{
  "ebay": {
    "low": 4.99,
    "high": 18.00,
    "sample_size": 14,
    "fetched_at": "2026-04-06T18:00:00Z"
  },
  "abebooks": {
    "low": 3.50,
    "median": 9.75,
    "high": 22.00,
    "sample_size": 8,
    "fetched_at": "2026-04-06T18:00:00Z"
  },
  "booksrun": {
    "buyback_price": 2.50,
    "condition": "GOOD",
    "fetched_at": "2026-04-06T18:00:00Z"
  }
}
```

If a source is unavailable or returns no results, its key is omitted. The AI and UI both handle partial data gracefully.

---

## Staleness Policy

Valuation data older than 30 days is considered stale. The UI flags stale data with a muted warning. The `/valuation/` refresh endpoint clears and re-fetches all sources.

---

## Wave A: Valuation Service & AI Integration (Forge + Nova)

Forge and Nova work in parallel — Forge builds the data layer, Nova updates the prompt while Forge is running.

- [ ] **A1 (Forge):** Add `fetch_valuation_data(isbn: str) -> dict` to `services.py`. Calls eBay Browse API (and AbeBooks/BooksRun if keys are available). Returns the merged `valuation_data` dict. Cache the result on `CatalogEntry.valuation_data` on entry creation when status is `SELL`. Add `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` to settings (read from env). Token management: fetch an Application token via client credentials flow and cache it in-process until expiry.
- [ ] **A2 (Forge):** Add `POST /api/entries/{id}/valuation/` endpoint — triggers a fresh market lookup for the given entry and updates `CatalogEntry.valuation_data`. Returns the updated `valuation_data` dict. Idempotent.
- [ ] **A3 (Nova):** Inject `valuation_data` into the `get_ai_recommendation()` prompt when present. Format it as a `market_context` block: median listing price, buyback price if available, eBay range. Instruct the AI to anchor `suggested_price` near the median and flag high-value books (median > $25) with elevated confidence for SELL. Also update `get_bulk_ai_recommendation()` prompt the same way.

## Wave B: Inventory Pagination (Forge + Prism)

Deferred from Phase 7. Bundled here since Prism is already touching Inventory for the valuation UI.

- [ ] **B1 (Forge):** Add `PageNumberPagination` to `CatalogEntryViewSet` (page size: 50). Response shape changes to `{count, next, previous, results: [...]}`.
- [ ] **B2 (Prism):** Update `Inventory.jsx` to handle paginated responses. Load page 1 on mount and on filter changes. Add a "Load More" button that appends the next page to the existing list. Preserve all existing filter/search/sort state across page loads.

## Wave C: Valuation UI (Prism)

Depends on Wave A.

- [ ] **C1 (Prism):** In `EditRecordModal`, display `valuation_data` when present. Show a compact price range card: `Low / Median / High` from AbeBooks (or eBay range if AbeBooks unavailable), plus buyback price from BooksRun if present. Include source name and `fetched_at` date. Flag stale data (> 30 days) with a muted `text-muted` note: "Pricing data from [date] — may be outdated."
- [ ] **C2 (Prism):** Add a "Refresh Pricing" button in the valuation card that calls `POST /api/entries/{id}/valuation/` and updates the displayed data in-place. Show a spinner while in-flight.
- [ ] **C3 (Prism):** In `TriageWizard` Step 2 (`RecommendationCard`), show a valuation badge next to `suggested_price` when `valuation_data` is present: `"Market: $X–$Y"`. For high-value books (median > $25), render the badge with `variant="warning"` and the label `"High Value"` to prompt the user to double-check before donating.

## Wave D: Tests & Audit (Forge + Sentry)

- [ ] **D1 (Forge):** Unit tests for `fetch_valuation_data` — mock eBay HTTP responses (200 with listings, 200 with no results, 401, timeout). Test that `CatalogEntry.valuation_data` is populated on SELL-status entry creation and empty for non-SELL entries. Test the `/valuation/` refresh endpoint (200 on success, 404 on bad entry ID).
- [ ] **D2 (Sentry):** Full audit — `manage.py test`, `ruff check .` (with `ruff.toml` in place per Phase 8 process notes), `npm run lint`, `npx prettier --check .`. GREEN LIGHT required before commit.

---

## Process Improvements (vs. Phase 7)

Per Atlas orchestration reflection, the following changes are in effect for Phase 8:

1. **Nova line-length mandate active** — all Pydantic Field description strings must fit within 88 characters.
2. **Forge scoped by file cluster** — Wave A Forge prompt will be split into two sub-agents: one for `services.py` (A1), one for `views.py` + `settings.py` (A2). Tighter context, less wasted reading.
3. **Archivist fires in parallel with Sentry** — doc sync will be launched alongside Wave D's Sentry audit rather than after it.
4. **`ruff.toml` to be added by Forge in Wave A** — codifies pre-existing accepted violations so ruff output is actionable.

---

## Deferred (Phase 9 candidates)

| Item | Reason |
|------|--------|
| AbeBooks integration | Requires affiliate registration confirmation |
| BooksRun integration | Requires API key — contact needed |
| Goal-level analytics (outcome distribution by culling goal) | Feature-sized, no blocking dependency |
| Async cover image download | Low priority for single-user app |

---

## Post-Mortem Criteria

Phase 8 is complete when:
1. `uv run python manage.py test` — all pass
2. `uv run ruff check .` — zero errors beyond codified ignores in `ruff.toml`
3. `npm run lint` — zero errors
4. `npx prettier --check .` — clean
5. eBay Browse API returning live price ranges for test ISBNs
6. `valuation_data` populated on SELL entries and surfaced in EditRecordModal and TriageWizard Step 2
7. Sentry signs off with GREEN LIGHT
