# Remediation & Implementation Plan: BookBounty v2

Based on the Senior Developer Code Review, this plan outlines the steps to stabilize and optimize the BookBounty platform.

---

## Phase 1: Stability & Performance (Backend)

### Task 1.1: Fix N+1 Queries
- **Goal:** Optimize `CatalogEntryViewSet` to fetch related books in a single query.
- **Action:** Update `CatalogEntryViewSet.get_queryset()` to include `.select_related('book')`.

### Task 1.2: Stabilize Test Suite
- **Goal:** Restore passing status to all automated tests.
- **Action:**
  - Update `test_dashboard_stats` to match the new nested response schema.
  - Implement a `BaseAPITestCase` that handles user creation and token authentication for all endpoint tests.

### Task 1.3: API Resilience
- **Goal:** Prevent Open Library hangs.
- **Action:** Add a 10-second timeout to all `requests.get` calls in `services.py`.

---

## Phase 2: Refactoring & Maintainability

### Task 2.1: AI Engine Optimization
- **Goal:** Reduce overhead on AI requests.
- **Action:**
  - Move `instructor` and `genai` client initialization to module level in `ai_engine.py`.
  - Implement a dedicated exception handler for AI failures to provide better logging.

### Task 2.2: Frontend Component Decomposition
- **Goal:** Simplify `TriageWizard.jsx`.
- **Action:**
  - Extract `RecommendationCard` into a standalone component.
  - Extract `ConditionForm` into a standalone component.
  - Centralize `StatusBadge` and `ConditionBadge` into `src/components/common/`.

### Task 2.3: Lifecycle Security
- **Goal:** Protect `resolved_at` from direct manipulation.
- **Action:** Set `resolved_at` to `read_only=True` in `CatalogEntrySerializer`. Logic should strictly flow through the `/resolve/` endpoint.

---

## Phase 3: UX & Polish

### Task 3.1: Global Error Handling
- **Goal:** Provide consistent error feedback.
- **Action:** Implement a React Context or a shared Hook for managing global notifications/toasts.

### Task 3.2: Form Validation
- **Goal:** Prevent invalid data entry.
- **Action:** Add Zod or basic HTML5 validation to the `EditRecordModal` and `TriageWizard` forms.

---

## Implementation Schedule

| Week | Phase | Key Deliverable |
|---|---|---|
| 1 | Phase 1 | 100% passing tests and optimized ORM. |
| 2 | Phase 2 | Refactored frontend and secured lifecycle fields. |
| 3 | Phase 3 | Centralized error handling and form validation. |
