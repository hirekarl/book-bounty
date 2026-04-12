# Orchestration Reflection Log: Archive

Entries moved here from `REFLECTION.md` when their principles were fully absorbed into persona files or the rolling window was exceeded. Read `REFLECTION.md` for active sessions.

### 2026-04-09: AI Resource Stewardship & Interface Hardening
- Principles (Resource Stewardship, State-Ref Dualism, Fail-Safe Interfaces) absorbed into Forge.md and Prism.md Key Lessons.

---

### 2026-04-08: MVP Polish Pass & Multi-Tenant Hardening
- **Task:** Pre-MVP review: multi-tenant schema hardening, rate limiting, eBay single-listing fixes.
- **Principle: Database-Level Isolation** → Ember.md. **Secure Defaults** → Ember.md. **Toolchain Portability** → Prism.md, Sentry.md.

### 2026-04-08: Test Refinement & Migration Hardening
- **Task:** Finalized multi-tenant database integrity and test coverage.
- **Principle: Database-level constraints require database-level verification** → Forge.md. **Defensive Backfill Logic** → Forge.md.

### 2026-04-08: Rate Limiting + resolved_at Validation
- **Task:** DRF throttle on `/api/auth/register/`; future-date guard on `resolved_at`.
- Implementation in code. Throttle scope: `RegistrationRateThrottle`, `"registration": "10/hour"`. ruff TRY003 codified in ruff.toml.

### 2026-04-08: Ember Security Review — Multi-Tenant Implementation
- **Task:** Adversarial review of multi-tenant implementation. 6 findings, none Critical/High.
- Key finding: `CatalogEntrySerializer.culling_goal` unscoped FK — fixed via `get_fields()` override.
- **Principle: DRF auto-generates unscoped FKs** → Ember.md Key Lessons.

### 2026-04-08: Staff Audit, Persona Refactor, New Specialists
- **Task:** Added Ember and Scout; replaced Feedback Logs with Key Lessons across all personas.
- **Principle: Persona files should be scannable in one pass** → Archivist.md.

### 2026-04-08: User Registration — Complete
- **Task:** `RegisterView` backend + `Register.jsx` frontend.
- **Decision: No allauth** → Forge.md Key Lessons.

### 2026-04-08: User Registration — Implementation Plan
- Pure pre-execution planning artifact. Implementation in code.

### 2026-04-08: Multi-Tenant Refactor — Model & View Layer Complete
- **Task:** user FK on CullingGoal + CatalogEntry; 7 view surfaces scoped.
- **Patterns: queryset=none() + get_queryset(), perform_create injection, test fixture discipline** → Forge.md mandates + feedback_multitenancy_patterns.md.

---

### 2026-04-07: Transition to Multi-Tenant Architecture
- Doc update pass. No new principles.

### 2026-04-07: UX Audit + Full-App Copy & Workflow Remediation
- **Task:** 4-wave UX remediation; 23 copy changes, nav, workflow guards, hierarchy.
- **Principle: ESLint requires `cd frontend/` first** → Prism.md. **auto-retrigger reqVersionRef pattern** → CLAUDE.md §6.

### 2026-04-07: Phase 9 Execution + SPA Routing Fix
- **Principle: `render.yaml` routes block is authoritative; `_redirects` alone insufficient** → Scout.md Key Lessons.

### 2026-04-07: Phase 9 Proposal
- Pure planning artifact.

### 2026-04-07: Render Deployment Documentation
- Created DEPLOYMENT.md. No new principles.

### 2026-04-07: README.md Project Genesis Update
- Added Project Genesis section. No new principles.

### 2026-04-07: Archival, DEMO_MODE, and Valuation Wiring Fix
- **Principle: Trace full data path (DB → view → response → state → prop → render)** → Sentry.md integration gap check.

### 2026-04-07: Phase 8 (Valuation Intelligence)
- **Principle: Parallel wave execution; Archivist alongside Sentry** → Atlas.md, feedback_orchestration.md.

### 2026-04-07: Phase 10 (App Mission Audit & UX Remediation)
- **Principle: Audit agents over-report; filter for mission-critical** → Atlas.md Key Lessons.
- **ESLint `cd` pattern** → Prism.md.

---

### 2026-04-06: Phase 3 (Notifications & Validation)
- **Principle: Sentry Audit & Reject** → Sentry.md.

### 2026-04-06: Phase 4 (Bulk Triage Wizard)
- **Principle: `model_dump(mode="json")` for Pydantic/DRF Enum serialization** → Forge.md mandates.

### 2026-04-06: Book Cover Loading Fix
- Implementation detail. No lasting principle.

### 2026-04-06: Triage Wizard Submission Fix
- Implementation detail. No lasting principle.

### 2026-04-06: Phase 5 (Shelf Impact Dashboard)
- **Principle: Sentry Audit & Reject shifts quality burden to specialists** → Sentry.md.

### 2026-04-06: Phase 6 (Marketplace Launchpad)
- **Principle: CRLF/LF regressions** → Prism.md.

### 2026-04-06: Phase 7 (Stability & Hardening)
- **Principle: Nova E501 on Field descriptions** → Nova.md Key Lessons.

### 2026-04-06: Fellowship Documentation & Synthesis
- **Principle: Zero hallucination on dates** → Archivist.md.
