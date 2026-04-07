# BookBounty v3: The Institutional Acquisition Marketplace

## 1. The Vision

BookBounty v3 builds on the AI-driven triage engine of v2 by adding a new outcome for books: **"Offer for Acquisition."** Instead of a book landing in DONATE or SELL and disappearing into the void, it enters a curated marketplace where registered institutions — libraries, school collections, archives, special collections — can discover and acquire it directly from the owner.

BookBounty becomes the connective tissue between private collections being downsized and institutions actively looking to grow theirs. We are a **software-first matchmaking layer**, not a logistics company.

---

## 2. The New Triage Bucket: Offer for Acquisition

When a user scans a book and the AI recommends SELL or DONATE, a third path is now surfaced: **Offer for Acquisition.** The AI flags this when the book's metadata suggests institutional value — an older edition of an academic text, a regional history title, a subject-matter specialty, a first printing.

The user can accept this recommendation in one click. The book enters their **Acquisition Pool**: still physically on their shelf, but now visible to registered institutions whose Collection Development Policies (CDPs) have been indexed in the system.

---

## 3. Institutional Matching Engine

Institutions register with BookBounty and define their CDP:

- Subject areas they are actively collecting
- Acceptable condition thresholds
- Format preferences (hardcover, trade paperback, etc.)
- Budget range per acquisition

BookBounty's matching engine runs continuously against the pool of user-offered books. When a book's metadata aligns with an institution's CDP, both parties are notified.

**For the institution:** A curated alert — "We found a 1987 first edition of [Title] in Good condition, matching your American Southwest History priority. Procurement fee: $18."

**For the book owner:** A notification — "A library is interested in your copy of [Title]. Accept and ship to receive $12 cash or a charitable donation receipt."

---

## 4. Transaction Flow (No Warehouse Required)

BookBounty facilitates the transaction entirely in software:

1. Institution accepts the match and pays the procurement fee through the platform.
2. BookBounty generates a pre-paid USPS shipping label addressed directly to the institution.
3. The owner prints the label, drops the book at any post office, and scans the QR code to confirm shipment.
4. BookBounty pays out the owner's share (or generates a donation receipt for a tax write-off) once delivery is confirmed.
5. The institution marks receipt. Transaction closes.

Books move owner-to-institution directly. BookBounty takes a platform fee from each transaction. No warehouse, no routing, no physical infrastructure.

---

## 5. Revenue Model

**Institutional subscriptions:** Libraries and collections pay a monthly fee to have their CDP indexed and receive match alerts. Tiered by number of active acquisition priorities and volume of alerts.

**Transaction fee:** BookBounty takes a percentage of each procurement fee when a match closes.

**User subscriptions:** Individual users pay a small monthly fee to unlock unlimited AI triage sessions and access to the Acquisition Pool feature. A free tier covers basic scanning with a monthly cap.

**Tax write-off facilitation:** For users who prefer a donation receipt over cash, BookBounty partners with a qualified 501(c)(3) intermediary to issue receipts compliantly. This is a premium feature included in the paid user tier.

---

## 6. Why This Works

**For users:** The triage workflow they already use in v2 now has an upside — books they were going to donate for nothing might be worth $10–$30 to the right institution, with minimal extra effort.

**For institutions:** A new acquisition channel that surfaces books not in the traditional vendor pipeline. Useful for filling gaps in specialty collections, local history, or subject areas underserved by major distributors like Baker & Taylor or Ingram.

**For BookBounty:** A B2B subscription revenue stream layered on top of a consumer product that already does the hard work of identifying and cataloging books. The data asset — a pool of individually-owned, AI-cataloged books with condition metadata — is the moat.

---

## 7. What v3 Is Not

- **Not a peer-to-peer lending platform.** Interpersonal book loans are high-friction, low-revenue, and logistically complex. The institutional acquisition model is more defensible and better monetized.
- **Not a warehouse operation.** All physical logistics are owner-to-institution, facilitated by software. Physical infrastructure is a v4+ consideration if volume warrants regional consolidation.
- **Not a general used-book marketplace.** We are not competing with ThriftBooks or AbeBooks. Our supply is AI-cataloged from active culling sessions; our demand is institutional, not retail.

---

## 8. Validation Path

Before building the matching engine, validate institutional demand:

1. Interview 10 library acquisitions directors: would they pay a subscription + per-acquisition fee to access a pool of individually-owned, condition-graded books matched to their CDP?
2. Run a manual version of the match: take 50 books from beta user Acquisition Pools and email them to 5 librarians. Measure response rate and willingness to pay.
3. If validated, build the CDP registration UI and matching engine. The triage infrastructure from v2 is already the supply side.

---

## 9. Success Metrics

- **Institutional conversion rate:** % of CDP matches that result in a completed acquisition.
- **Owner participation rate:** % of users who place at least one book in their Acquisition Pool.
- **Time to match:** Median time from a book entering the pool to a matched institution alert.
- **Institutional retention:** Monthly churn rate among subscribed institutions.
