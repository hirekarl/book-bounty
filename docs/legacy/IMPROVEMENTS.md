# BookBounty: UX & Database Improvements Plan

Following a comprehensive audit of the user experience, several friction points were identified, particularly for users managing large collections. This document outlines the planned improvements to the UI/UX and the corresponding database/API changes.

## 1. Streamlined Triage Workflow (High Priority)

### Current Problem
The existing triage wizard requires 4 distinct steps ("Scan" -> "Metadata" -> "Decision" -> "Outcome"). For a user with dozens of books, this is too many clicks per item.

### Planned UI/UX Fixes
- **One-Page Triage:** Combine metadata confirmation, condition selection, and the final decision into a single interactive view that appears immediately after a successful scan.
- **Continuous Scanning:** Ensure the "Scan Another" action is the default and fastest path after a successful triage.
- **Visual Confirmation:** Display book cover thumbnails from Open Library to give users immediate visual feedback that they are triaging the correct book.

### Database/Backend Requirements
- **`Book` Model:** Add a `cover_url` field to store the thumbnail link from Open Library.
- **`services.py`:** Update the metadata fetch logic to extract and store the cover image URL.

## 2. Condition & Pricing Intelligence (Medium Priority)

### Current Problem
Condition is currently a list of "damage flags," and the "Sell" status requires the user to manually guess a price by leaving the app to check external sites.

### Planned UI/UX Fixes
- **Condition Grading:** Replace the flat list of flags with a structured grading system (e.g., Mint, Good, Fair, Poor) to simplify the decision process.
- **Pricing Helpers:** Add direct links to "Search on eBay" and "Search on Amazon" next to the `asking_price` field, pre-populated with the book's ISBN/Title.

### Database/Backend Requirements
- **`CatalogEntry` Model:** Add a `condition_grade` field using Django `TextChoices`.
- **`CatalogEntry` Model:** Add a `valuation_data` JSON field to cache any external pricing data retrieved during the process.

## 3. Inventory Power Tools (Medium Priority)

### Current Problem
Correcting mistakes (e.g., moving 10 books from "Keep" to "Donate") currently requires editing each entry individually.

### Planned UI/UX Fixes
- **Bulk Actions:** Add checkboxes to the Inventory table and a "Batch Action" dropdown (e.g., "Change Status to...", "Delete Selected").
- **Enhanced Sorting:** Allow sorting the collection by `publish_year`, `status`, or `created_at`.

### Database/Backend Requirements
- **API:** Implement a new bulk-update endpoint (`PATCH /api/entries/bulk/`) in `views.py` to process multiple records in a single transaction.

---

## Implementation Roadmap

1. **Step 1:** Database Migration (Add `cover_url`, `condition_grade`, etc.).
2. **Step 2:** Update Backend Services (Cover image fetching).
3. **Step 3:** Refactor Triage Wizard (One-page view + Cover display).
4. **Step 4:** Implement Bulk API & Inventory UI Updates.
