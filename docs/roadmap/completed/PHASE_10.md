# Phase 10: App Mission Audit & UX Remediation

## Overview

A comprehensive audit pass surfacing UI/UX issues at odds with BookBounty's core mission: single-user, goal-driven personal library triage. Eleven findings were identified across all frontend pages, organized into four implementation waves.

**Audit date:** 2026-04-07  
**Audited by:** Atlas + parallel sub-agents (Explore mode, one per page group)  
**Implementation:** Atlas/Prism

---

## Findings Summary

| ID | Priority | Finding | File(s) |
|----|----------|---------|---------|
| A | 1 | Landing claims "Shelf impact metrics" — feature was deleted | `Landing.jsx` |
| B | 1 | Landing footer reads "AI workflow automation MVP" — wrong product identity | `Landing.jsx` |
| G | 1 | Dashboard fallback tagline "garage sale goldmine" implies selling is primary purpose | `Dashboard.jsx` |
| H | 1 | Landing "Estate Executors" cohort implies multi-user / delegation workflows | `Landing.jsx` |
| D | 2 | Fallback AI (`is_fallback: true`) is treated same as real recommendation — Accept enabled | `RecommendationCard.jsx` |
| E | 2 | No visual distinction between AI-recommended status and user-overridden status | `RecommendationCard.jsx` |
| I | 2 | "Use AI suggestion" recovery link in override mode is too subtle | `RecommendationCard.jsx` |
| C | 3 | Auto-retrigger (condition change debounce) fires silently — no loading state shown | `TriageWizard.jsx` |
| F | 3 | BulkReviewModal defaults `is_resolved: true` — pre-resolves entries without user intent | `BulkReviewModal.jsx` |
| J | 4 | Inventory empty state conflates "no books ever" with "no filter match" | `Inventory.jsx` |
| K | 4 | Dashboard empty goal card has no inline CTA when no active goal exists | `Dashboard.jsx` |

---

## Implementation Waves

### Wave 1 — Stale/False Copy
**Files:** `Landing.jsx`, `Dashboard.jsx`  
**Risk:** Very low — pure text changes

- **A:** Replace stale "Shelf impact metrics (space recovered, earnings)" in FEATURES array with accurate description of progress tracking.
- **B:** Replace footer "AI workflow automation MVP" with "Personal AI-powered library triage."
- **G:** Replace Dashboard fallback tagline with neutral goal-driven framing: "Decide what stays, what sells, and what goes."
- **H:** Remove "Estate Executors" from COHORTS array in `Landing.jsx`.

### Wave 2 — Recommendation Card Trust Signals
**Files:** `RecommendationCard.jsx`  
**Risk:** Low — presentational only

- **D:** When `is_fallback: true`, disable the Accept button and require explicit user acknowledgment before proceeding. Fallback warning must be a blocker, not a footnote.
- **E:** When `overriding === true`, display a "Your choice" badge or tinted state on the status display. The card must distinguish AI-generated status from user-set status at all times.
- **I:** In override mode, promote "Use AI suggestion" from a small text link to a full-width outlined button below the status grid — equal visual weight to "Choose My Own."

### Wave 3 — Workflow Correctness
**Files:** `TriageWizard.jsx`, `BulkReviewModal.jsx`  
**Risk:** Medium — state and logic changes

- **C:** When the 800ms condition-change debounce fires, immediately set `aiLoading: true` so the Accept button disables and the spinner appears — identical loading UX to a manual trigger. Closes the silent-update window.
- **F:** Change `BulkReviewModal.jsx` initial `is_resolved` state from `true` to `false`. User must explicitly opt in to resolving entries.

### Wave 4 — Empty States & Onboarding
**Files:** `Inventory.jsx`, `Dashboard.jsx`  
**Risk:** Low — conditional rendering

- **J:** In `Inventory.jsx`, distinguish two empty states: if entries are zero AND no filters/search are active, show "You haven't scanned any books yet" with a CTA to `/scan`. Otherwise, show the existing filter-mismatch message.
- **K:** In `Dashboard.jsx`, when `activeGoal === null && !goalsLoading`, add brief body copy and an inline "Create Your First Goal" button inside the card body that triggers `setShowNewGoalForm(true)`.

---

## Definition of Done

- All 11 findings addressed
- ESLint exit:0 on all modified files
- CLAUDE.md Section 6 updated to reflect any behavior changes
- Self-reflection entry added to `docs/staff/REFLECTION.md`
- Memory synced
- Committed
