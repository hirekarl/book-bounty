# BookBounty v2: AI-Driven Culling Engine

## 1. The Vision
BookBounty is evolving from a manual triage tool into an **AI-powered librarian and downsizing consultant**. Instead of the user deciding the fate of every book, the system uses **Gemini 2.5 Flash** (via `instructor`) to recommend outcomes based on the user's specific culling goals and the book's inherent value/condition.

## 2. Core Concept: User Culling Goals
Before starting a triage session, the user defines their "Culling Goal." This goal serves as the system prompt context for the AI.

### Example Goals:
*   **"The Minimalist Transition":** "I am moving into a tiny house. I only want to keep books that are absolute essentials, high-value collectibles, or have deep personal meaning. Reduce collection by 80%."
*   **"The Financial Optimizer":** "I need to raise money for a move. Recommend selling anything with a market value over $15. Donate the rest unless it's a rare edition."
*   **"The Space Maker":** "I'm clearing out a room for a new nursery. Keep my favorite fiction, but suggest discarding/donating old textbooks and outdated reference materials."

## 3. The AI Decision Engine (Gemini 2.5 Flash)
The backend will ingest:
1.  **User Goal:** The high-level directive.
2.  **Book Metadata:** Title, Author, Year, Subjects, Description.
3.  **Physical Condition:** The condition grade and specific damage flags.
4.  **Market Context (Future):** Pricing data (if available).

### AI Output (via `instructor`):
The AI will return a structured recommendation including:
*   **Recommended Status:** (KEEP, DONATE, SELL, DISCARD)
*   **Confidence Score:** 0.0 - 1.0.
*   **Reasoning:** A short, human-readable sentence explaining *why* (e.g., "Outdated 2015 tech manual; does not fit your 'Minimalist' goal.")
*   **Suggested Action:** (e.g., "Check eBay for similar first editions before finalizing.")

## 4. Refined User Workflow
1.  **Goal Setting:** User selects or types their culling goal on the Dashboard.
2.  **The Continuous Scan:** User scans a book.
3.  **The AI Recommendation:** The UI immediately shows:
    *   Book Cover & Info.
    *   **"AI Suggests: [SELL]"** with the reasoning.
4.  **User Confirmation:** The user can "Accept AI Suggestion" (one click) or "Override" to pick a different status.

## 5. Success Metrics
*   **Decision Speed:** Time spent per book should decrease.
*   **Goal Alignment:** The final inventory status distribution should reflect the user's stated goal.
