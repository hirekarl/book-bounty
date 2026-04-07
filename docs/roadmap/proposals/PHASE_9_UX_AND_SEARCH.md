# Phase 9: UX Improvements & Advanced Search

## Objectives

This phase addresses critical workflow bottlenecks and user experience friction points discovered during recent testing and initial deployments.

### 1. Front-End Environment Stabilization (Line Endings)
**Problem:** Frequent CRLF/LF line-ending regressions during front-end development cause massive, noisy linting errors that overwhelm sub-agents (especially Prism and Sentry), leading to wasted context turns and rejected handovers.
**Solution:** 
- Enforce strict `LF` line endings at the editor/agent level.
- Sentry and Prism must explicitly verify that `npx prettier --write` or equivalent normalization occurs successfully before any PR/handover.
- Update Prism's technical mandate to explicitly reject/prevent CRLF introduction.

### 2. Dashboard Hierarchy & Culling Goal Visibility
**Problem:** The Culling Goal is the foundational context for the AI, yet it is currently pushed down the visual hierarchy on the Dashboard, obscured by the `Shelf Impact` / `SpatialROI` components. If a user tries to scan without a goal, they are kicked back to the dashboard, where the goal selector is still out of immediate view.
**Solution:**
- Elevate the Culling Goal card to sit *above* or alongside the Shelf Impact section on the `Dashboard.jsx`.
- Visually highlight the "Active Goal" state so the user's current context is undeniable before they click "Start Scanning".

### 3. Advanced Triage Search (Fallback for Missing/Unscannable ISBNs)
**Problem:** Rare, antique, or damaged books often lack a scannable barcode or a readable ISBN. The current `TriageWizard.jsx` step 1 strictly requires an ISBN, blocking users from cataloging these items.
**Solution:**
- Expand the "Manual Entry" section in the `TriageWizard` to support a "Search by Title/Author" mode.
- Update the Open Library API integration (`services.py`) to support a `/search.json?title=...&author=...` fallback if a direct ISBN lookup fails or is not provided.
- Present a disambiguation UI (a short list of matching books) for the user to select the correct edition before proceeding to Step 2 (AI Analysis).

## Execution Strategy

- **Wave A (Atlas/Prism):** Implement the Dashboard layout changes. Fix line-ending configurations globally (e.g., `.gitattributes` or `.prettierrc` reinforcement).
- **Wave B (Forge):** Implement the Open Library search fallback endpoint in the backend.
- **Wave C (Prism):** Wire the advanced search UI into `TriageWizard.jsx` Step 1.
- **Wave D (Sentry):** Comprehensive audit of the new flows and line-ending compliance.
