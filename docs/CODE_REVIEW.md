# Senior Developer Code Review: BookBounty v2

**Reviewer:** Gemini CLI (Senior Software Engineer)
**Date:** April 6, 2026
**Scope:** Full-stack (Django/React) audit of the BookBounty library triage application.

---

## 1. Backend Audit (Django/DRF)

### 1.1 ORM Efficiency & Performance
- **N+1 Query Vulnerability:** In `CatalogEntryViewSet`, the queryset does not use `select_related('book')`. Since the `CatalogEntrySerializer` nests the `BookSerializer`, every entry in the list view triggers an additional query to fetch book metadata.
- **Aggregation Logic:** `DashboardStatsView` performs multiple individual queries to calculate stats. This could be optimized into a single aggregate query using `Count` with conditional `Q` filters to reduce database roundtrips.

### 1.2 AI Engine (`ai_engine.py`)
- **Resource Management:** The `instructor` client and `genai.Client` are initialized inside the `get_ai_recommendation` function. These should be instantiated at the module level or via a singleton pattern to avoid redundant setup on every request.
- **Error Handling:** While there is a retry loop for 429s, other `ClientError` exceptions are re-raised without context. A more robust approach would log specific failure modes (e.g., safety filters, token limits) before bubbling up.

### 1.3 Service Layer (`services.py`)
- **Third-Party Resilience:** The Open Library lookup in `fetch_book_metadata` uses a bare `requests.get`. It lacks a timeout, which could hang the Django worker if the Open Library API is slow or unresponsive.

### 1.4 Test Suite
- **Regression:** `APITests.test_dashboard_stats` is broken. It expects a flat dictionary response, but the view was updated to return a nested structure (`active`, `resolved`, `in_collection`).
- **Security:** API tests are not passing authentication headers. Since `IsAuthenticated` is the default permission class, these tests are likely returning 403s but might be passing due to loose assertions (e.g., only checking data content without status codes).

---

## 2. Frontend Audit (React)

### 2.1 State Management & Complexity
- **`TriageWizard.jsx` Blob:** This component is handling too many responsibilities: camera lifecycle, ISBN lookup, AI polling, and final submission. It should be decomposed into smaller sub-components (e.g., `BarcodeScanner`, `RecommendationCard`, `ConditionForm`).
- **Repetitive UI Logic:** The "Status Badge" and "Condition Pill" logic is duplicated across `Dashboard`, `Inventory`, and `TriageWizard`. These should be centralized in a `components/common/` directory.

### 2.2 User Experience (UX)
- **Error Feedback:** Error alerts are scattered and use local state. A more robust solution would be a centralized toast system or a global error boundary for API failures.
- **Form Validation:** Client-side validation is minimal. Fields like `asking_price` should have more rigorous constraints before submission (e.g., ensuring it's a valid positive decimal).

### 2.3 Performance
- **Unnecessary Re-renders:** In `Inventory.jsx`, the use of `useCallback` is good, but many inline objects and arrays in the JSX (like `style` and `VIEW_OPTIONS`) cause child components to re-render unnecessarily on every state change.

---

## 3. Architecture & Security

### 3.1 Environment Variables
- **Inconsistency:** Some variables are prefixed with `VITE_` for the frontend, but the backend doesn't consistently use a `.env` loader (it relies on shell environment). Using `python-dotenv` or `django-environ` would ensure consistency.

### 3.2 Security
- **Data Integrity:** The `resolved_at` field can be updated via the generic `PATCH` endpoint. While convenient, this bypasses the `resolve` action's business logic (which is intended to be an idempotent, timestamped event). Sensitive lifecycle fields should be read-only in the serializer.

---

## 4. Summary of Findings

| Priority | Issue | Category |
|---|---|---|
| **High** | N+1 Queries in Inventory | Performance |
| **High** | Broken Test Suite | Quality Assurance |
| **Med** | Component Bloat (`TriageWizard`) | Maintainability |
| **Med** | API Timeout Missing | Resilience |
| **Low** | UI Logic Duplication | Maintainability |
