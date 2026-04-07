# Phase 7 Implementation Plan: Stability & Hardening

## Objective

Address all findings from the April 2026 senior-developer audit. No new features — this phase locks down data integrity, security posture, error handling, and frontend robustness before the next feature phase begins.

## Audit Source

17 findings across 5 severity tiers. See audit summary in `docs/staff/REFLECTION.md` (April 2026 session).

---

## Priority Rationale

| Tier | Criteria | Count |
|------|----------|-------|
| P0 — Fix Now | Silent data loss or security risk | 3 |
| P1 — High | Logic bugs causing incorrect behavior | 4 |
| P2 — Medium | Error handling gaps, bad UX states | 6 |
| P3 — Low | Polish, config hygiene, test coverage | 4 |
| Deferred | Requires architectural work (async, pagination) | 2 |

---

## Wave A: Data Integrity & Security (Forge)

All P0/P1 backend fixes. Must land before any frontend work begins.

- [ ] **A1 (Forge):** Fix silent unresolve bug — `resolved_at` is marked read-only on `CatalogEntrySerializer`, so frontend un-resolve PATCHes are silently dropped. Remove read-only constraint and handle `null` correctly in serializer, or add a dedicated `unresolve` action endpoint alongside `resolve`.
- [ ] **A2 (Forge):** Guard `SECRET_KEY` — remove hardcoded insecure fallback; raise `ImproperlyConfigured` if env var is missing.
- [ ] **A3 (Forge):** Wrap `CullingGoalViewSet.perform_update()` in `transaction.atomic()` to eliminate race condition on `is_active` flag.
- [ ] **A4 (Forge):** Validate bulk AI recommendation response — after `get_bulk_ai_recommendation()` returns, assert all requested entry IDs are present; return 502 with clear error if the AI omits any.
- [ ] **A5 (Forge):** Fix N+1 in `DashboardImpactView` — replace Python iteration over `removed_entries` with a single `Sum()` DB aggregation.
- [ ] **A6 (Forge):** Add ISBN format validation to `BookLookupView` — reject non-ISBN strings with a 400 before hitting Open Library.
- [ ] **A7 (Forge):** Add `.distinct()` to `CatalogEntryViewSet` search union to prevent duplicate rows when title and author both match.
- [ ] **A8 (Forge):** Make HTTP request timeout configurable via `REQUESTS_TIMEOUT` env var (default `10`).
- [ ] **A9 (Forge):** Add CORS production guard — raise `ImproperlyConfigured` if `CORS_ALLOWED_ORIGINS` is unset and `DEBUG=False`.

## Wave B: Frontend Robustness (Prism)

Depends on Wave A (specifically A1 for the unresolve fix).

- [ ] **B1 (Prism):** Align unresolve UI with Wave A backend fix — verify `EditRecordModal` correctly sends a PATCH that clears `resolved_at`, and update UI messaging to confirm the action round-trips properly.
- [ ] **B2 (Prism):** Replace `Promise.all` with `Promise.allSettled` in `BulkReviewModal` — surface per-entry failure count in the error message rather than aborting silently.
- [ ] **B3 (Prism):** Fix `cover_image` null fallback in `Inventory.jsx` — replace `||` chain with explicit `?? undefined` so broken `<img src=null>` is never rendered.
- [ ] **B4 (Prism):** Fix camera race condition in `TriageWizard.jsx` — use a `ref` to track the `Html5Qrcode` instance so rapid toggle or fast navigation can't leave a zombie instance.

## Wave C: AI Transparency (Nova)

- [ ] **C1 (Nova):** Add `is_fallback: bool` field to `TriageRecommendation` schema — set `True` when the AI client is unavailable and the hardcoded fallback is returned. Surface a user-facing warning banner in `TriageWizard.jsx` (Prism to implement display side after Nova lands schema change).
- [ ] **C2 (Prism):** Display AI unavailability warning — when `recommendation.is_fallback === true`, render an alert in the Step 2 recommendation card informing the user the AI was unreachable.

## Wave D: Test Coverage (Forge + Sentry)

- [ ] **D1 (Forge):** Add serializer edge-case tests — cover invalid `book_id` FK, missing `book_id` on create, and `resolved_at` PATCH behavior.
- [ ] **D2 (Forge):** Add end-to-end integration test covering the full happy path: login → create goal → lookup book → get recommendation → create entry → resolve entry.

## Wave E: Final Audit (Sentry)

- [ ] **E1 (Sentry):** Run full audit: `uv run python manage.py test`, `uv run ruff check .`, `npm run lint`, `npx prettier --check .`. Reject and escalate any failures to Atlas.

---

## Deferred (Phase 8 candidates)

These require meaningful architectural work and are out of scope for a hardening pass:

| Item | Reason for Deferral |
|------|---------------------|
| **Inventory pagination** | Requires API pagination class + frontend infinite scroll or page controls — feature-sized work |
| **Async cover image download** | Single-user app; synchronous I/O is acceptable at this scale. Revisit if multi-user is ever targeted |

---

## Post-Mortem Criteria

Phase 7 is complete when:
1. `uv run python manage.py test` — all pass
2. `uv run ruff check .` — zero errors
3. `npm run lint` — zero errors
4. `npx prettier --check .` — clean
5. Sentry signs off with GREEN LIGHT
