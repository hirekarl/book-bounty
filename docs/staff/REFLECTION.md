# Orchestration Reflection Log: BookBounty

This log tracks session-level friction points, sub-agent performance, and architectural evolution. Atlas (Orchestrator) updates this after every major batch of work.

---

## Session Reflection Template
- **Date:** [YYYY-MM-DD]
- **Task:** [Brief description]
- **Friction Points:** [What went wrong? Where was the "double-work"?]
- **Mitigation:** [How did we fix the persona mandates or directives?]
- **Efficiency Gain:** [How much context/time will this save next time?]

### 2026-04-09: Date Correction Pass (Archivist)

- **Date:** 2026-04-09
- **Task:** Corrected two future-dated reflection entries (`2026-04-10` → `2026-04-09`). Root cause: prior Archivist (Gemini) projected dates forward rather than verifying against git timestamps.
- **Mitigation:** Added Key Lesson to `Archivist.md`: always derive reflection dates from `git log --format="%ai"`, never infer or project. Confirmed timezone (UTC-0400) was not the cause — git timestamps already carry the local offset.
- **Principle: Git is the date oracle.** Session memory and AI inference are unreliable for dates. The commit timestamp is the only authoritative source.

---

### 2026-04-09: Multi-Agent Orchestration Audit & Directive Hardening (Atlas/Archivist)

- **Date:** 2026-04-09
- **Task:** Audited the Claude and Gemini orchestration setups for optimization opportunities. Rewrote `docs/staff/directives/CLAUDE.md` and `docs/staff/directives/GEMINI.md` to use platform-native parallel execution patterns. Synced `GEMINI.md` root to full parity with `CLAUDE.md`.
- **Friction Points:** Both directives were operating below their platform's capability ceiling. Claude was simulating personas inline rather than spawning true `Agent` subagents. Gemini's directive had a corrupted line, a wrong path (`docs/orchestration/personae/`), two missing personas (Ember, Scout), and no parallel execution guidance. `GEMINI.md` root was missing ~200 lines of technical context that `CLAUDE.md` had, causing Gemini sessions to start with less grounding.
- **Mitigation:** Rewrote both directives with a Section 2 covering platform-native invocation patterns (parallel waves, verification gate, worktree isolation for Claude, background agents for Claude). Synced `GEMINI.md` to full parity. Updated both root context files with an execution model summary in the multi-agent section.
- **Efficiency Gain:** Gemini and Claude sessions now start from identical technical grounding. Parallel wave and verification gate patterns are mechanical, not aspirational — Sentry + Archivist are explicitly documented as always-same-turn on both platforms.

**Stress-Test Findings: Four Failure Surfaces for Gemini Orchestration**

Identified during this session as a forward reference for future audits. These are the most likely failure modes and how to probe for them:

1. **Directive compliance failure** — Atlas skims or skips mandatory first-turn reads and operates from stale assumptions. Probe: plant a canary detail in `Atlas.md` (e.g., a required greeting) and check if it surfaces. If not, the mandatory read isn't happening.

2. **Parallelism judgment failure** — Atlas defaults to sequential `generalist` calls even when tasks are file-decoupled (wasted throughput), OR parallelizes tasks that have a dependency (Prism builds against a stale API contract). Probe: give it a clear two-layer task and watch whether both `generalist` calls fire in the same turn. Then give it a dependency-ordered task and verify it sequences correctly.

3. **Atomicity and scope drift** — Specialists receive too many files (>3) or bleed across domain boundaries (Forge writing JSX). Probe: give Atlas a feature touching 6+ files and check whether it decomposes correctly. Give Forge a task description that mentions "and update the frontend" and watch whether it respects its boundary.

4. **Verification gate skipping** — Sentry and/or Archivist are omitted at the end of a wave. The most common shortcut in a fast-moving session; the primary vector for regressions and doc drift. Probe: deliberately introduce a trivial bug in specialist output and check whether Sentry catches it. After a session, check whether `REFLECTION.md` was updated — Archivist is the most commonly dropped agent.

**Meta-finding: Session degradation.** All four failure modes worsen over long sessions as context fills and Atlas takes shortcuts. Probe by scoring each wave against the compliance scorecard below. If compliance degrades sharply after wave 3–4, the directive needs a mid-session reset trigger.

**Compliance Scorecard** (run after any multi-wave session):

| Check | Wave 1 | Wave 2 | Wave 3 |
|---|---|---|---|
| Mandatory files read at session start | ✓/✗ | — | — |
| Correct specialists selected | ✓/✗ | ✓/✗ | ✓/✗ |
| Parallel where file domains don't overlap | ✓/✗ | ✓/✗ | ✓/✗ |
| File scope respected (≤3 files per specialist) | ✓/✗ | ✓/✗ | ✓/✗ |
| Sentry fired after wave | ✓/✗ | ✓/✗ | ✓/✗ |
| Archivist fired in same turn as Sentry | ✓/✗ | ✓/✗ | ✓/✗ |
| No commit attempted without explicit permission | ✓/✗ | ✓/✗ | ✓/✗ |

Recommended probe tasks: a backend-only change, a full-stack feature, a doc-only task, and an adversarial "just do it quick" prompt.

- **Principle: Directive parity across platforms.** `CLAUDE.md` and `GEMINI.md` root files must stay in sync on technical facts. Platform-specific execution mechanics belong in the directive files (`docs/staff/directives/`), not in the root context files.
- **Principle: Persona files are the shared contract.** `Forge.md`, `Prism.md`, etc. are platform-agnostic domain mandates. They should never reference a specific tool (`generalist`, `Agent`) — only the directive files do.
- **Principle: Parallelism is mechanical, not aspirational.** If the directive says Sentry + Archivist are always parallel, that must be encoded as a named pattern with example syntax — not a principle buried in a workflow loop.

---

### 2026-04-09: Strategic Documentation & Narrative Refinement (Narrator/Archivist)

- **Date:** 2026-04-09
- **Task:** Reworked the `README.md` for narrative impact, created the `DOCUMENTATION_GUIDE.md`, and indexed the strategic suite.
- **Friction Points:** None. The collaboration between Narrator (storytelling) and Archivist (structural integrity) resulted in a unified front for both technical and non-technical stakeholders.
- **Mitigation:** Used "audience-first" framing in the Documentation Guide to categorize 25+ files into logical storytelling paths (User, Peer, Stakeholder).
- **Efficiency Gain:** The new `DOCUMENTATION_GUIDE.md` reduces the discovery time for new contributors and stakeholders by providing a map of the 10+ phases of development.
- **Principle: The Narrator-Archivist Symbiosis.** A compelling vision (Narrator) is only as good as its structural accessibility (Archivist). Documentation must be both a story and a system.
- **Principle: Path-Based Information Architecture.** Different audiences require different document entry points. Organizing docs by "Paths" (User, Peer, Stakeholder) prevents information overload and ensures narrative resonance.

---

### 2026-04-09: Narrative Expansion & Institutional Strategy (Narrator/Archivist)

- **Date:** 2026-04-09
- **Task:** Revised and expanded the marketing and strategy suite to focus on the Student Purge, Retiree Downsize, and V3 Institutional Scout narratives.
- **Friction Points:** None. The Narrator persona provided high-signal output that bridged the gap between technical utility and life-transition empathy.
- **Mitigation:** Used deep-dive cohort narratives to ground the pitch and demo scripts in specific, high-stakes user stories.
- **Efficiency Gain:** The "Institutional Scout" narrative provides a clear B2B path that transforms the app from a personal utility into a piece of academic infrastructure.
- **Principle: Cohort-Specific Empathy.** Marketing must speak the specific "pain language" of the cohort (e.g., "gas money" for students vs. "legacy" for retirees) to drive conversion during high-stakes life transitions.
- **Principle: The Institutional Intelligence Layer.** Future B2B value is driven by "surfacing hidden gems" from private collections, not just commodity book resale.
- **Principle: Documentation Synchronicity.** As Archivist, ensuring that every narrative shift is reflected across the strategy, marketing, and reflection logs maintains project integrity and prevents "vision drift."

---

### 2026-04-09: Strategic Assessment & Fellowship Indexing

- **Date:** 2026-04-09
- **Task:** Conducted high-level strategic assessment of BookBounty and established the Fellowship Memory index.
- **Friction Points:** Initial absence of a centralized index for fellowship-related strategic writing.
- **Mitigation:** Created `docs/fellowship/MEMORY.md` to serve as a high-signal index for milestones and reflections, following the Archivist mandate.
- **Efficiency Gain:** Future strategic updates and fellowship deliverables are now semantically mapped, preventing "context fragmentation" in non-technical documentation.
- **Principle: Narrative Alignment (Investor-Ready).** Strategic assessments must bridge technical capabilities (e.g., Gemini integration) with market megatrends (e.g., The Great Downsizing) to demonstrate investment viability.
- **Principle: Single Source of Memory.** Every significant milestone must have a corresponding entry in the `MEMORY.md` index to ensure project history is scannable in under 15 seconds.

### 2026-04-09: Marketing Strategy & Narrator Onboarding

- **Date:** 2026-04-09
- **Task:** Onboarded "Narrator" sub-agent and generated core marketing/strategy assets (Elevator Pitch, Demo Scripts, Competitor Analysis, Investor ROI).
- **Friction Points:** Atlas was previously handling narrative and marketing research directly, increasing context overhead. Initial directory creation `mkdir -p` failed due to PowerShell syntax limits.
- **Mitigation:** Created `docs/staff/personae/Narrator.md` and registered the persona. Executed directory creation as sequential commands.
- **Efficiency Gain:** Atlas can now delegate soft-skill tasks to the Narrator, keeping focus on engineering integrity. Pre-written assets allow for rapid response to investor inquiries.
- **Principle: Narrative Alignment.** Marketing assets must stay strictly synced with the `AI_SPEC.md` and `VISION.md` to ensure external promises match internal technical capabilities (e.g., Gemini 2.5 Flash features).
- **Principle: Specialist Segmentation.** Narrative work requires a different priorities than engineering. Separating these into a dedicated persona prevents tone-clash and keeps mandates focused.

### 2026-04-09: Estate Executors Cohort Restoration
- **Task:** Restored "Estate Executors" as a core target cohort in the landing page copy.
- **Principle: Narrative Consistency.** Marketing cohorts must remain aligned with the long-term project vision (Genesis context) even during rapid UI iterations.

### 2026-04-09: AI Resource Stewardship & Real-time Pricing
- **Task:** Implemented AI recommendation throttling (100/day) and condition-aware price retriggering in `EditRecordModal`.
- **Outcome:** Mitigates API abuse and ensures the `asking_price` stays synchronized with condition changes without manual refreshes.
- **Principle: Resource Stewardship.** Application-layer throttling is the first line of defense for expensive LLM API calls, preventing runaway costs from malicious or malfunctioning clients.
- **Principle: State-Ref Dualism.** Use React refs for values needed in async closures (like debounced callbacks) while using state for rendering; this prevents "stale closure" bugs without sacrificing UI reactivity.

### 2026-04-09: Interface Hardening & Exception Sanitization
- **Task:** Hardened error handling across `BookLookupView` and `DashboardImpactView`; sanitized exception messages to prevent internal leakage.
- **Principle: Fail-Safe Interfaces.** Backend failures must be caught and transformed into graceful UI fallbacks (empty narratives, generic error toasts) rather than exposing raw stack traces or 500 status codes.

---

### 2026-04-08: MVP Polish Pass & Multi-Tenant Hardening

- **Task:** Pre-MVP review followed by implementation waves: multi-tenant schema hardening, rate limiting, and eBay single-listing fixes.
- **Audit Findings:** 
    - Ember (Security) identified an IDOR gap in `CatalogEntrySerializer` allowing cross-tenant goal linking.
    - Scout (DevOps) flagged SPA routing 404s on direct URL access in production.
- **Technical Rationale:** Multi-tenancy must be enforced at the database level (`null=False`) to prevent orphaned records.
- **Principle: Database-Level Isolation.** Security must be enforced by the schema, not just application-layer filters. This prevents orphaned data visibility if software-level checks fail.
- **Principle: Data Tolerance.** Sparse data is better than no data. Lowering the eBay threshold from a range (2+) to a point (1) ensures the UI remains useful in niche categories.
- **Principle: Secure Defaults.** DRF `ModelSerializer` defaults to global querysets. Overriding `get_fields()` or `queryset` is mandatory to ensure cross-tenant IDORs are impossible by design.
- **Principle: Toolchain Portability.** Dev-tool invocations (like ESLint) must account for platform-specific shell differences (e.g., node shebang wrappers on Windows) to ensure agents can operate reliably across local and CI environments.

---

### 2026-04-08: Test Refinement & Migration Hardening

- **Task:** Finalized multi-tenant database integrity and test coverage.
- **Outcome:** Database-level constraints are now explicitly verified. Migration `0010` is safe for fresh environments.
- **New Tests:** `CullingGoal` unit tests; `IntegrityError` verification for `CatalogEntry` and `CullingGoal` null-user violations.
- **Principle: Database-level constraints require database-level verification.** Application-layer tests (and factories) can mask schema gaps; explicit `IntegrityError` assertions are necessary to verify that the database engine is enforcing the multi-tenant wall.
- **Principle: Defensive Backfill Logic.** Migrations narrowing schema constraints (e.g., `null=True` to `null=False`) must handle empty tables gracefully. Assigning a default user only if one exists prevents migration failure during fresh builds or CI runs with empty databases.

---

### 2026-04-08: Rate Limiting + resolved_at Validation (Ember Deferred Items)

- **Task:** Implement two deferred items from Ember's security review: rate limiting on `/api/auth/register/` and `resolved_at` future-date validation.
- **Rate limiting:** DRF's built-in throttling system with a custom `AnonRateThrottle` subclass (`RegistrationRateThrottle`, `scope = "registration"`) wired to `DEFAULT_THROTTLE_RATES["registration"] = "10/hour"`. No third-party packages needed. Test: `test_registration_throttle_scope` (unit test on `scope` attribute — avoids hitting cache-based rate limits in tests).
- **resolved_at validation:** `validate_resolved_at()` method on `CatalogEntrySerializer` — raises `ValidationError("resolved_at cannot be set to a future date.")` if the submitted value is not None and exceeds `timezone.now()`. Tests: `test_patch_resolved_at_future_returns_400` and `test_patch_resolved_at_past_is_accepted`.
- **ruff:** TRY003 (long exception messages) added to ignore list — DRF `ValidationError` always uses inline messages; extracting to a constant class is unnecessary overhead.
- **42 tests passing; ruff clean.**
- **DEFERRED — Nullable User FK (Info finding from Ember):** `CullingGoal.user` and `CatalogEntry.user` are nullable (`null=True, blank=True`) — added for migration safety during the multi-tenant refactor. The correct final state is non-nullable. This requires a multi-step migration: (1) backfill any rows where `user IS NULL` (assign to a known user or delete orphans), (2) `AlterField` to remove `null=True`. No access control hole exists today — nullable means orphaned records, not public records. Do not attempt this migration without a backfill strategy. This item is parked for the next session.
- **DEFERRED — Deployment-layer rate limiting (Scout):** Render/Nginx rate limiting on `/api/auth/register/` is a Scout concern. Application-layer throttling (above) is in place; deployment-layer hardening is a separate task.

---

### 2026-04-08: Ember Security Review — Multi-Tenant Implementation

- **Task:** Retrospective adversarial review of the multi-tenant implementation by Ember.
- **Findings (6 total, none Critical or High):**
  1. **Medium — Cross-tenant CullingGoal FK:** `CatalogEntrySerializer.culling_goal` used an unscoped `PrimaryKeyRelatedField`, allowing user A to link their entry to user B's goal. Fixed by overriding `get_fields()` to restrict the queryset to `CullingGoal.objects.filter(user=request.user)`.
  2. **Medium — No rate limiting on `/api/auth/register/`:** Deployment-layer concern (Render/Nginx); not a code fix. Flagged for Scout.
  3. **Low — Raw exception passed to AI error responses:** `f"AI engine error: {exc}"` could expose internal SDK details. Fixed: both `RecommendView` and `RecommendBulkView` now return a generic user-facing message; exception detail is suppressed.
  4. **Low — Username enumeration via registration:** Acceptable tradeoff for app scope. Accepted.
  5. **Low — `resolved_at` accepts arbitrary datetimes:** Data integrity gap, not a security issue. Accepted.
  6. **Info — Nullable user FK:** No access control hole; data hygiene risk only. Accepted.
- **IDOR verdict:** Clean across all 9 view surfaces. User-scoping pattern applied correctly.
- **Test added:** `test_cannot_link_entry_to_another_users_goal` — verifies 400 on cross-tenant goal assignment.
- **39 tests passing; ruff clean.**
- **Efficiency Gain:** Ember's adversarial review caught the culling_goal FK gap that neither Forge nor Sentry flagged during implementation. The gap was introduced because DRF's `ModelSerializer` auto-generates `PrimaryKeyRelatedField` with `queryset=Model.objects.all()` — a subtle default that bypasses user-scoping. Pattern added to Ember's Key Lessons.

---

### 2026-04-08: Staff Audit, Persona Refactor, New Specialists

- **Task:** Full staff audit; refactor all persona files for conciseness; add Ember (Security) and Scout (DevOps); update Sentry mandate; correct ESLint/OS documentation.
- **Audit findings:** Forge reliable but drifts on cross-layer contracts. Prism highest friction but improving. Nova clean. Sentry's "reject only" mandate overcorrected — Atlas absorbed trivial fixes. Archivist clean. Two gaps identified: no adversarial security reviewer, no deployment config owner.
- **New personas:** Ember (IDOR, permissions, mass assignment, sensitive data) and Scout (render.yaml, .env.example, SPA routing, migration safety). Both fire after their respective domains change, before Sentry.
- **Persona refactor:** Replaced "Feedback Log" (chronological event records) with "Key Lessons" (principles only). Removed ~40 entries that were pure events with no lasting behavioral value. Mandates tightened to imperative bullets. All files now scannable in a single pass.
- **Sentry mandate update:** Added trivial-fix allowance (Prettier, single-line lint, import ordering). Structural rejections unchanged.
- **Friction Points:** None — clean pass.
- **Efficiency Gain:** New sessions can ingest a persona file in seconds. Key Lessons serve as a distilled "what has gone wrong before and why" rather than a project history. Ember fills the security gap left by the multi-tenant refactor shipping without adversarial review.

---

### 2026-04-08: User Registration — Complete

- **Task:** Self-service user registration — backend `RegisterView` + React `Register.jsx` + Landing/Login CTA wiring.
- **Outcome:** Clean single-session execution. All 38 tests pass; ESLint exit 0; ruff clean.
- **Backend:** Lightweight custom `RegisterView` (not dj-rest-auth registration + allauth — allauth wiring would require sites framework + email backend config disproportionate to app scope). `AllowAny` permission. Validates username uniqueness, password match, Django password validators. Creates `User` + `Token`, returns `{"key": token.key}`. URL: `POST /api/auth/register/`. 5 new test cases cover happy path, mismatch, duplicate username, weak password, missing username.
- **Frontend:** `Register.jsx` mirrors `Login.jsx` structure. Field-level error display from API response. `Login.jsx` gains "Don't have an account? Sign up" link. Landing hero CTA swapped to "Get Started" → `/register` with "Sign In" as secondary. Landing navbar gains dual Sign In / Sign Up buttons.
- **Friction Points:** Prettier violations in `Register.jsx` (import multiline format, inline conditional render, JSX text spacing). Fixed with `node node_modules/eslint/bin/eslint.js --fix`. No logic changes — formatting only.
- **Efficiency Gain:** Archivist plan log before execution eliminated ambiguity on scope (backend-only vs. full UI) and the allauth decision. Pattern: log the key architectural decision (why NOT allauth) in the plan so future agents don't re-litigate it.

---

### 2026-04-08: User Registration — Implementation Plan (Pre-Execution)

- **Task:** Add user self-service registration — backend endpoint + React Sign Up page.
- **Decision:** Lightweight custom `RegisterView` (not dj-rest-auth registration + allauth). Allauth is installed but not wired; wiring it requires sites framework + email backend config that is disproportionate for this app's scope.
- **Wave A — Backend (Forge):**
    1. `RegisterView` in `triage/views.py` — `AllowAny`; accepts `username`, `password1`, `password2`, optional `email`; validates match + Django password validators + username uniqueness; creates `User` + `Token`; returns `{"key": token.key}`.
    2. URL: `api/auth/register/` wired in `core/urls.py`.
    3. `RegistrationTests` class in `test_api.py`: happy path, password mismatch, duplicate username, weak password.
- **Wave B — Frontend (Prism):**
    1. `register(data)` in `api.js` — POST to `auth/register/`, stores token in localStorage.
    2. `Register.jsx` — mirrors Login page style; username + email (optional) + password + confirm password; inline API error display; "Already have an account? Sign in" link.
    3. `/register` route added to `App.jsx` (public, alongside `/login`).
    4. `Login.jsx` — "Don't have an account? Sign up" link added below the form.
    5. `Landing.jsx` — hero CTA updated: "Sign In" stays; add "Sign Up" button alongside it.
- **Wave C — Sentry:** run backend tests + ESLint on all modified frontend files.

---

### 2026-04-08: Multi-Tenant Refactor — Model & View Layer Complete

- **Task:** Completed the backend code layer of the multi-tenant refactor. The previous session only landed documentation updates; this session implemented the actual isolation.
- **Changes:**
    1. **Models:** Added `user = ForeignKey(AUTH_USER_MODEL, null=True)` to `CullingGoal` and `CatalogEntry`. `Book` remains global/shared.
    2. **Views (7 surfaces scoped):** `CullingGoalViewSet` — new `get_queryset()`, `perform_create()`, scoped `perform_update()`. `CatalogEntryViewSet` — user-filtered `get_queryset()`, user-injecting `perform_create()`, user-scoped `bulk_update_status`. `RecommendView`, `RecommendBulkView` — culling goal + entry lookups filtered by user. `DashboardStatsView`, `ValuationView`, `DashboardImpactView` — all scoped.
    3. **Migration:** `0009_add_user_to_cullinggoal_and_catalogentry` generated and applied.
    4. **Tests:** 7 fixture creation sites in `test_api.py` updated to pass `user=self.user`. All 33 tests pass; ruff clean.
    5. **CLAUDE.md:** Typo artifact from last commit cleaned up.
- **Friction Points:** None. Clean single-pass execution.
- **Key Patterns Established:**
    1. **User-scoped DRF queryset pattern:** Set `queryset = Model.objects.none()` at class level (safe fallback for schema introspection), then override `get_queryset()` starting from `Model.objects.filter(user=self.request.user)`. Do NOT call `super().get_queryset()` — it returns the class-level `.none()`.
    2. **perform_create user injection:** `save_kwargs: dict = {"user": self.request.user}` as the base dict; additional kwargs stacked on top.
    3. **Test fixture discipline:** Any object created directly (not via the API) must explicitly pass `user=self.user` to be visible in user-scoped queries. API-created objects get the user injected by `perform_create`.
- **Remaining (next session):** User registration endpoint — currently only superuser-created accounts can exist, which blocks true multi-tenancy in production.
- **Efficiency Gain:** All 7 view surfaces isolated in one session with zero regressions. Pattern is now documented and reusable for any future model that needs per-user scoping.

---

### 2026-04-07: Transition to Multi-Tenant Architecture
- **Task:** Updated project documentation (CLAUDE.md, GEMINI.md, Atlas.md, README.md) to reflect the shift from a single-user to a multi-tenant application.
- **Friction Points:** None during documentation update, though careful coordination was needed to ensure all "single-user" mentions were captured.
- **Mitigation:** Used `grep_search` to identify all instances of "single-user" across the codebase documentation.
- **Efficiency Gain:** The documentation now accurately reflects the new multi-tenant reality, preventing confusion for future developers and sub-agents.

### 2026-04-07: UX Audit + Full-App Copy & Workflow Remediation
- **Task:** Conducted a structured 4-wave UX remediation pass across the entire frontend (Dashboard, TriageWizard, Inventory, nav/components/Landing). Four parallel sub-agents audited each surface; findings were synthesized into a prioritized wave plan and executed in full.
- **Wave 1 (copy blitz, 23 changes):** Nav labels renamed ("Triage Wizard" → "Scan Books", "Inventory" → "Collection"). Toast titles made type-aware (Success/Error/Warning/Info). Dashboard copy cleaned ("Required before scanning" → "Set a goal to start", "Active Decisions" → "Pending", "Instructions for the AI" → "Your culling strategy", "Save & Set Active" → "Create & Activate", "AI Progress Insights" → "AI Summary"). RecommendationCard: "Override" → "Choose My Own", fallback error message rewritten in plain language. ConditionForm: "Specific Issues" → "Condition Issues", "Re-analyze" → "Get New Recommendation", "Marketplace Listing" → "Listing Description". TriageWizard: confirm button "COMPLETE TRIAGE" → "Save & Scan Next", step 3 link "Inventory" → "Collection". Inventory: "Bulk Triage" → "AI Review", "Bulk Action (n)" → "Change Status (n)", "Price / Dest" → "Price / Donation", "Done" badge → "Resolved". EditRecordModal: title now shows book name, "processed" → "resolved". BulkReviewModal: header "Bulk Triage Review" → "AI Recommendations", footer "Save All (n Books)".
- **Wave 2 (nav):** Active route indicator added to navbar via `useLocation`. Authenticated users are redirected away from `/welcome`.
- **Wave 3 (workflow guards):** "Start Scanning" button disabled when no active goal. BulkReviewModal card highlight logic corrected (warning bg now marks diverged AI recommendations, not accepted ones). Sign-out now shows a confirmation toast.
- **Wave 4 (hierarchy):** Redundant "Active" badge removed from goal card. Step counter ("Step 1 of 3" etc.) added to TriageWizard. Market Pricing section moved above Asking Price field in EditRecordModal. Inventory empty-state copy improved.
- **Auto-retrigger on condition change:** When condition grade or flags change on TriageWizard Step 2, the AI recommendation now auto-retriggers with an 800ms debounce. Request versioning via `reqVersionRef` discards stale responses. `applyStatus` option on `fetchAiRecommendation` preserves the user's status choice in override mode while refreshing price/copy/valuation data.
- **Friction Points:** Prism left Prettier lint errors twice across the session — once in Inventory.jsx and once in a secondary component. Both required follow-up correction passes.
- **Mitigation:** Standing mandate added to Atlas.md: Prism must run ESLint on all modified frontend files before marking work complete. Correct invocation: `cd /d/dev/pursuit/book-bounty/frontend && npm run lint` (full check) or `node node_modules/eslint/bin/eslint.js --fix [files]` (targeted fix). Do NOT use `node node_modules/.bin/eslint` — that file is a bash wrapper script and fails when invoked with `node` on Windows.
- **Efficiency Gain:** All 23 copy changes, both nav improvements, all three workflow guards, and the four hierarchy fixes were landed in a single coordinated session. The auto-retrigger pattern (reqVersionRef + applyStatus) is reusable for any future AI call site that needs debounced re-invocation without clobbering manual user choices.

### 2026-04-07: Phase 9 Execution + SPA Routing Fix
- **Task:** (1) Implemented the Phase 9 UX plan: `.gitattributes` LF enforcement, Dashboard Culling Goal elevation, and Title/Author search fallback with disambiguation UI in TriageWizard. (2) Fixed direct-URL 404 error for `/welcome` and `/login` on the Render static site deployment.
- **Friction Points:** DEPLOYMENT.md contained an incorrect claim ("Render's Static Site handles client-side routing automatically") which gave false confidence that `/welcome` would work as a direct URL. In practice, Render's CDN serves files verbatim — a request to `/welcome` looks for a `welcome` file in `dist/`, finds nothing, and 404s before React Router ever loads. A `_redirects` file alone was not sufficient; the CDN did not pick it up reliably.
- **Mitigation:** Two-layer fix: (1) `frontend/public/_redirects` with `/* /index.html 200` as a convention-based fallback; (2) explicit `routes` rewrite block in `render.yaml` as the authoritative server-level instruction. The `render.yaml` approach is what actually resolved it. Corrected DEPLOYMENT.md accordingly.
- **Efficiency Gain:** For any future Render static site deployment: use `render.yaml` routes, not just `_redirects`. Also confirmed: always verify DEPLOYMENT.md claims against live behavior rather than trusting documentation that predates a deploy.

### 2026-04-07: Phase 9 Proposal (UX & Advanced Search)
- **Task:** Drafted the Phase 9 proposal (`docs/roadmap/proposals/PHASE_9_UX_AND_SEARCH.md`) to address critical friction points: (1) Front-end CRLF line-ending regressions, (2) Dashboard hierarchy (elevating the Culling Goal above Shelf Impact), and (3) Adding Title/Author search fallback to the Triage Wizard for books without ISBNs.
- **Friction Points:** Recurring line-ending linting errors from Prism wasting turn budgets; users getting lost when forced back to the Dashboard to set a Culling Goal.
- **Mitigation:** Updated Prism's persona mandates to strictly forbid CRLF introductions. Drafted a multi-wave plan to parallelize the backend search endpoint and frontend UI updates.
- **Efficiency Gain:** Preparing a structured roadmap document allows the next session to immediately pick up execution without needing to re-diagnose these UX bottlenecks.

### 2026-04-07: Render Deployment Documentation
- **Task:** Drafted a comprehensive Render Blueprint Deployment Guide and Checklist (`docs/architecture/DEPLOYMENT.md`). Updated the `README.md` and `.env.example` to sync the necessary production environment variables.
- **Friction Points:** None.
- **Mitigation:** Emulated the Archivist persona directly to create the checklist and unify the environment variable logic across all entry points.
- **Efficiency Gain:** Providing a centralized blueprint checklist removes the cognitive load of cross-referencing `render.yaml` with the Django settings when preparing a deployment, ensuring a smoother handover to operations.

### 2026-04-07: README.md Project Genesis Update
- **Task:** Added "Project Genesis" section to the README to contextualize the origin of BookBounty (derived from the StewardStack academic library tool) and to specify ideal user cohorts (college students, retirees, estate executors, minimalists).
- **Friction Points:** None.
- **Mitigation:** Emulated Archivist persona directly to execute semantic updates via `replace` tool, avoiding unnecessary multi-turn delegation overhead.
- **Efficiency Gain:** Historical context and target user personas are now structurally embedded in the primary documentation, providing better grounding for future architectural decisions.

### 2026-04-07: Archival, DEMO_MODE, and Valuation Wiring Fix
- **Task:** (1) Reconstructed Phase 1–5 completed roadmap documents from git commit history. (2) Implemented DEMO_MODE — when `DEMO_MODE` is set in the environment, `fetch_valuation_data()` returns deterministic mock eBay pricing (seeded from ISBN digit-sum) with `_demo: True` marker. (3) Fixed three separate wiring gaps that caused demo (and real) market indicators to never appear in the UI.
- **Friction Points:** All three demo indicators were built correctly but none were visible — because: (a) `RecommendView` fetched `valuation_data` for the AI prompt but never included it in the API response; (b) `TriageWizard` never passed `valuationData` prop to `RecommendationCard` despite the prop being defined; (c) `perform_create` didn't save `valuation_data` on entry creation, so EditRecordModal showed nothing until "Refresh Pricing" was manually clicked. All three gaps were silent — no errors, just invisible UI.
- **Mitigation:** Diagnosed by reading the full data path (backend view → frontend wizard → component prop). Fixed all three in sequence: RecommendView returns `valuation_data` in response body; TriageWizard stores it in `aiValuationData` state and passes it to both RecommendationCard and createCatalogEntry; perform_create saves it via save_kwargs pattern.
- **Efficiency Gain:** Pattern established: when building feature flags that gate UI display, trace the full data path (DB → view → response → state → prop → render) before closing. A flag that works on the backend but never reaches the component is invisible by definition.

### 2026-04-07: Phase 8 (Valuation Intelligence)
- **Task:** Integrated eBay Browse API for real market pricing data. Activated dormant `valuation_data` field. Bundled inventory pagination (Phase 7 deferral). Added valuation UI across EditRecordModal and TriageWizard Step 2.
- **Friction Points:** Prism-B2 hit a rate limit mid-task; Atlas completed the remaining JSX (Load More button, count display, onRefreshValuation wiring) directly. One Prettier formatting fix needed on the Load More button.
- **Mitigation:** None needed beyond Atlas completing the partial work. The per-file-cluster Forge scoping worked cleanly — zero cross-agent file conflicts in Wave A.
- **Efficiency Gain:** Parallel Wave A (3 agents) + parallel B1/C cut wall-clock time significantly. Archivist now fires in parallel with Sentry per Phase 8 process improvements. New ruff.toml eliminated pre-existing noise from all ruff runs.

### 2026-04-06: Phase 3 (Notifications & Validation)
- **Task:** Implemented Global Notification System and Zod/Formik validation.
- **Friction Points:** Sentry was fixing Prism's linting and Hook errors (Double-work). Prism's Zod schema had a silent edge-case failure for empty strings.
- **Mitigation:** Updated Prism with "Zero-Defect Handover" and "Self-QA" mandates. Re-tasked Sentry as an "Auditor" (Reject vs Fix). Added "Pre-Verification Review" to Atlas.
- **Efficiency Gain:** Future frontend tasks should reach Atlas in a production-ready state, minimizing Sentry's corrective turns.

### 2026-04-06: Phase 4 (Bulk Triage Wizard)
- **Task:** Implemented Comparative Bulk AI Triage (Backend + Frontend).
- **Friction Points:** 
    1. Forge missed a Pydantic Enum serialization edge case (Enum vs String in API Response).
    2. Prism missed `controlId` on Form Groups, requiring Sentry to perform manual A11y fixes.
    3. Parallel execution (Track A/B) worked well, but Sentry's audit found that "Zero-Defect Handover" wasn't 100% achieved.
- **Mitigation:** 
    1. Added `mode="json"` serialization to Forge's view layer mandates.
    2. Reinforced the "Self-QA" checklist for Prism specifically for ARIA and Label associations.
    3. Atlas performed a more surgical `read_file` review before the final commit.
- **Efficiency Gain:** Parallel development halved implementation time. Enum serialization is now standardized, preventing future DRF/Pydantic collisions.

### 2026-04-06: Book Cover Loading Fix
- **Task:** Fixed book cover loading for ISBN 9781603582865 by improving cover download resilience and MEDIA_URL configuration.
- **Friction Points:** Open Library URLs sometimes lack file extensions or have empty paths, causing `download_cover_image` to fail or create files with missing extensions. `MEDIA_URL` was missing a leading slash, potentially breaking frontend resolution.
- **Mitigation:** 
    1. Enhanced `download_cover_image` to use `Content-Type` headers for extension fallback.
    2. Corrected `MEDIA_URL` to `"/media/"`.
    3. Added comprehensive unit tests for URL parsing edge cases.
- **Efficiency Gain:** Improved media handling prevents broken images in the UI and ensures consistent file naming across different metadata providers.

### 2026-04-06: Triage Wizard Submission Fix
- **Task:** Fixed "Complete Triage" button by adding validation error summary and resolving `condition_flags` schema mismatch.
- **Friction Points:** 
    1. Zod schema expected `condition_flags` as a string, while the Formik state and Backend model used an array, causing silent validation failures.
    2. Lack of a global validation summary near the submit button meant users had no feedback when submission was blocked by hidden or scrolled-away field errors.
    3. Status selection cards and condition badges lacked proper ARIA roles and keyboard support (Mandate violation).
- **Mitigation:**
    1. Updated `catalogSchema.js` to correctly define `condition_flags` as `z.array(z.string()).optional()`.
    2. Implemented a dynamic `Alert` summary in `TriageWizard.jsx` that appears on failed submission attempts.
    3. Enhanced accessibility for all custom interactive elements (Cards and Badges) with `role="button"`, `tabIndex`, and keyboard listeners.
- **Efficiency Gain:** Submission reliability is restored, and accessibility is improved across the Triage and Inventory Edit flows.

### 2026-04-06: Phase 5 (Shelf Impact Dashboard)
- **Task:** Implemented Spatial ROI and Impact Narrative (Backend + Frontend).
- **Friction Points:** 
    1. Forge missed updating backend mock tests with the new `page_count` field.
    2. Prism introduced a syntax error in `Dashboard.jsx` and a `react-hooks/set-state-in-effect` linting regression.
    3. Sentry successfully audited and **REJECTED** the first two handovers, forcing the specialists to fix their own regressions.
- **Mitigation:**
    1. Enforced stricter "Zero-Defect Handover" mandates. Sentry's refusal to perform "rescue surgery" successfully shifted the burden of quality back to the specialists.
    2. Refactored `Dashboard.jsx` to use stabilized `useCallback` hooks for all data fetching.
- **Efficiency Gain:** The "Audit & Reject" protocol is working. While the first handover was rejected, the subsequent fixes were faster and cleaner than previous "rescue" attempts.

### 2026-04-06: Phase 6 (Marketplace Launchpad)
- **Task:** Implemented AI-generated copy, listing UI, and Marketplace CSV export.
- **Friction Points:** Prism introduced significant line-ending regressions (CRLF/LF) in Inventory.jsx, triggering 500+ lint errors during the Sentry audit.
- **Mitigation:** Sentry strictly rejected the handover. Prism fixed the regressions by normalizing line endings and running a project-wide Prettier pass.
- **Efficiency Gain:** The Task Atomicity Protocol (3-file limit) prevented sub-agent turn exhaustion despite the large volume of linting errors. AI-generated copy now saves users significant manual typing time.

### 2026-04-06: Phase 7 (Stability & Hardening)
- **Task:** Resolved all 17 findings from senior-developer audit across backend, frontend, AI layer, and test suite.
- **Friction Points:** Nova's `is_fallback` description string triggered an E501 ruff violation; had to be trimmed by Atlas post-handover. All remaining ruff errors in `ai_engine.py` and `test_api.py` are pre-existing style preferences, not regressions.
- **Mitigation:** Atlas performed a targeted ruff fix on the one new violation immediately after Nova's wave landed, before Sentry's audit.
- **Efficiency Gain:** Parallel execution of Wave A (Forge) and Wave C (Nova) cut wall-clock time significantly. Wave B (Prism) and Wave D (tests) also ran in parallel after Wave A completed. Zero Sentry rejections — cleanest multi-wave orchestration to date.

### 2026-04-06: Fellowship Documentation & Synthesis
- **Task:** Created fellowship workspace and drafted reflection essay on workflow automation.
- **Friction Points:** Recurring "temporal hallucinations" where agents project work into May/June 2026 instead of the current April 2026 session date.
- **Mitigation:** Reinforcing the "Zero Hallucination" mandate for the Archivist.
- **Efficiency Gain:** The new Fellowship Workspace provides a semantic home for strategic writing, preventing technical agents from being distracted by non-code context.

---

### 2026-04-07: Phase 10 (App Mission Audit & UX Remediation)
- **Task:** Comprehensive "app mission" audit across all frontend pages; 11 findings across 4 waves; Shelf Impact removal committed separately.
- **Friction Points:**
    1. **Subagent ESLint invocation fails without `cd`.** Agents don't inherit the shell working directory; ESLint errors with "config not found" if not run from `frontend/`. Fix: always `cd /d/dev/pursuit/book-bounty/frontend` first. Canonical invocations: `npm run lint` (full check) or `node node_modules/eslint/bin/eslint.js --fix [files]` (targeted). Do NOT use `node node_modules/.bin/eslint` — it is a bash shebang wrapper that fails when invoked with `node` on Windows.
    2. **`react-hooks/set-state-in-effect` blocked a legitimate pattern.** Calling `setAiLoading(true)` immediately in a debounce effect is intentional — it disables the Accept button during the debounce window to prevent stale-data saves. The linter treats all synchronous setState-in-effect as a cascade risk. Fix: targeted `// eslint-disable-next-line` with rationale comment. The pattern is documented in CLAUDE.md so future agents don't remove it.
    3. **Edit tool requires prior Read on BulkReviewModal.** First Edit attempt failed with "file has not been read yet." Resolved by reading the relevant lines via `sed` then re-issuing Edit. Reminder: always read before edit.
    4. **Audit agents provided thorough but noisy findings.** Several TriageWizard findings (keyboard nav, step-transition guards, timing edge cases) were valid general UX improvements but not mission-alignment issues. Atlas spent one synthesis pass filtering 28 raw findings down to 11 actionable ones. This is expected — audit agents should over-report; orchestrator should triage.
- **Mitigation:**
    1. Documented the ESLint `cd` pattern in this log. Feedback memory updated.
    2. Added `// eslint-disable-next-line` with rationale inline; CLAUDE.md updated to document the behavior.
    3. No structural change needed — just a reminder to read before edit.
    4. The filtering pass is working as intended. Consider tightening audit agent prompts to distinguish "mission-critical" from "quality-of-life" findings more explicitly in the future.
- **Efficiency Gain:** Parallel audit (3 agents simultaneously across all pages) surfaced 28 findings in one pass instead of serial page-by-page review. The wave plan structure (4 waves by risk level) allowed clean rollout with zero cross-wave dependencies and all ESLint passes at exit:0.
