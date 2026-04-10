# Orchestration Reflection Log: BookBounty

Active session log. Rolling window: keep the last 10 sessions. When an entry ages out, move it to `REFLECTION_ARCHIVE.md` (compress to principle + pointer if its lessons are already in a persona file; drop if fully absorbed).

**Rule:** Principles only — no pure events. If a principle is already in a persona's Mandates or Key Lessons, do not duplicate it here. Drop the entry or reduce it to a one-liner pointer.

---

### 2026-04-09: Multi-Agent Orchestration Audit & Directive Hardening

- **Task:** Audited Claude and Gemini orchestration setups. Rewrote both directives with platform-native parallel execution patterns. Synced `GEMINI.md` root to full parity with `CLAUDE.md`.
- **Friction Points:** Claude was simulating personas inline (not spawning `Agent` subagents). Gemini's directive had a corrupted line, a wrong path, two missing personas (Ember, Scout), and no parallel guidance. `GEMINI.md` root was missing ~200 lines of technical context.
- **Mitigation:** Section 2 added to both directives covering named invocation patterns. Context files updated with execution model summary.
- **Principle: Directive parity across platforms.** Technical facts belong in root context files; platform execution mechanics belong in directive files. They must stay in sync.
- **Principle: Persona files are the shared contract.** Never reference a specific tool (`generalist`, `Agent`) in a persona file — only in the directive.
- **Principle: Parallelism is mechanical, not aspirational.** Named patterns with example syntax. Not a principle buried in a workflow loop.

**Stress-Test Failure Surfaces** (for future audits — full scorecard in Atlas.md Key Lessons):
1. **Directive compliance** — Atlas skips mandatory first-turn reads. Probe: canary detail in Atlas.md.
2. **Parallelism judgment** — Sequences when it should parallelize, or parallelizes across a dependency. Probe: two-layer task, watch turn structure.
3. **Atomicity/scope drift** — Specialist gets >3 files or bleeds domains (Forge writing JSX). Probe: 6-file feature request.
4. **Verification gate skipping** — Sentry/Archivist omitted after a wave. Probe: plant a trivial bug; check if Sentry fires.
- **Meta:** All four worsen as context fills. Re-read directive if >4–5 waves in.

---

### 2026-04-09: Date Correction Pass

- **Task:** Corrected two future-dated entries (`2026-04-10` → `2026-04-09`). Root cause: prior Archivist projected dates forward rather than checking git.
- **Principle: Git is the date oracle.** → Added to Archivist.md. Timezone was not the cause — git timestamps already carry the local offset (`-0400`).

---

### 2026-04-09: Strategic & Narrative Work (Narrator/Archivist)

- **Task:** Reworked README, created DOCUMENTATION_GUIDE.md, expanded cohort narratives (Student Purge, Retiree Downsize, Institutional Scout), established fellowship index.
- **Principle: Cohort-Specific Empathy.** Marketing must speak the specific pain language of the cohort ("gas money" for students vs. "legacy" for retirees).
- **Principle: The Institutional Intelligence Layer.** B2B value comes from surfacing hidden gems in private collections, not commodity resale.
- **Principle: Path-Based Information Architecture.** Organize docs by audience path (User, Peer, Stakeholder) to prevent information overload.
- **Principle: Single Source of Memory.** Every significant milestone needs a MEMORY.md entry — project history must be scannable in under 15 seconds.

---

### 2026-04-09: AI Resource Stewardship & Interface Hardening

- **Task:** AI throttle (100/day), condition-aware price retrigger in EditRecordModal, exception sanitization on backend views.
- **Principle: Resource Stewardship.** Application-layer throttling is the first line of defense against runaway LLM costs.
- **Principle: State-Ref Dualism.** Use refs for values needed in async closures; state for rendering. Prevents stale closure bugs without sacrificing reactivity.
- **Principle: Fail-Safe Interfaces.** Backend failures must produce graceful UI fallbacks — never raw stack traces or 500s.
