# BookBounty: AI Engine Specification

## 1. Technical Stack
- **Model:** `gemini-2.5-flash` (do NOT use `gemini-2.5-flash-latest` — that 404s)
- **Library:** `instructor` with `Mode.GENAI_STRUCTURED_OUTPUTS`
- **SDK:** `google-genai` (Google's official Python SDK)
- **File:** `backend/triage/ai_engine.py`

---

## 2. Structured Data Schemas (Pydantic)

### `TriageRecommendation`
Returned by `POST /api/recommend/` and embedded in each `BulkTriageRecommendation`.

```python
class TriageRecommendation(BaseModel):
    status: TriageStatus                      # KEEP | DONATE | SELL | DISCARD
    confidence: float                         # 0.0–1.0
    reasoning: str                            # 1-sentence explanation
    suggested_price: float | None             # Set when status=SELL
    suggested_donation_dest: str | None       # Set when status=DONATE
    notable_tags: list[str]                   # e.g. ["Collectible", "Outdated"]
    marketplace_description: str | None       # AI copy for SELL listings
    is_fallback: bool                         # True when AI client unavailable
```

`is_fallback=True` means the AI was unreachable and the response is a safe default (KEEP, confidence=0.5). The frontend surfaces a warning banner in this case.

### `BulkTriageRecommendation`
Extends `TriageRecommendation` with an entry binding:

```python
class BulkTriageRecommendation(TriageRecommendation):
    catalog_entry_id: int
```

### `BulkRecommendationResponse`
```python
class BulkRecommendationResponse(BaseModel):
    recommendations: list[BulkTriageRecommendation]
```

### `ImpactNarrative`
Returned by `get_impact_narrative()` for the Shelf Impact Dashboard:
```python
class ImpactNarrative(BaseModel):
    win_summary: str   # 2-3 sentence encouraging progress summary
```

---

## 3. Client Initialization

```python
# Module-level singleton — initialized once, reused across requests
client = instructor.from_genai(
    genai.Client(api_key=api_key),
    mode=instructor.Mode.GENAI_STRUCTURED_OUTPUTS,
)
```

Do NOT use `Mode.GEMINI_JSON` — that mode is invalid. Do NOT re-initialize the client per request.

---

## 4. Prompt Architecture

### `get_ai_recommendation()` — Single Book

**Inputs:**
- `user_goal: str` — the active culling goal description
- `book_metadata: dict` — title, author, year, subjects, description
- `condition: dict` — grade (MINT/GOOD/FAIR/POOR), flags list
- `valuation_data: dict | None` — market pricing from eBay/AbeBooks/BooksRun (Phase 8+)

**System prompt directives:**
- Act as expert librarian + downsizing consultant
- Anchor `suggested_price` near market median when valuation data is present
- Flag books with median listing price > $25 with higher SELL confidence
- Generate `marketplace_description` for all SELL recommendations

**User prompt structure:**
```
Book Metadata: title, author, year, subjects, description
Market Pricing Data: eBay range / AbeBooks median / BooksRun buyback (or "Not available")
Culling Goal: {user_goal}
Physical Condition: grade, flags
```

### `get_bulk_ai_recommendation()` — Comparative Multi-Book

**Inputs:**
- `entries: QuerySet[CatalogEntry]`
- `culling_goal: CullingGoal`
- `valuation_map: dict[int, dict] | None` — entry_id → valuation_data

Performs a **comparative analysis** across all entries in a single Gemini call. Each entry's market context is injected per-book. Returns `BulkRecommendationResponse`.

**View-level validation:** After the AI returns, `RecommendBulkView` asserts all requested entry IDs are present in the response. Returns 502 if any are missing.

### `get_impact_narrative()` — Progress Summary

Generates a personalized, encouraging `win_summary` based on aggregate resolution stats. Returns `ImpactNarrative`.

---

## 5. Error Handling

### Rate limits
```python
# Uses google.genai.errors.ClientError (NOT google.api_core)
from google.genai.errors import ClientError

except ClientError as exc:
    if exc.status_code == 429 and attempt < max_retries - 1:
        time.sleep(2 ** attempt)   # Exponential backoff, max 3 retries
    else:
        raise
```

### Client unavailable
When `get_instructor_client()` returns `None` (missing API key or init error), `get_ai_recommendation()` returns a fallback `TriageRecommendation` with `is_fallback=True`, `status=KEEP`, `confidence=0.5`. The frontend displays an "AI engine unreachable" warning banner.

### ISBN validation
`BookLookupView` validates ISBN format (`^\d{9}[\dX]$` or `^\d{13}$`) before calling Open Library. Returns 400 on malformed input.

### Open Library timeouts
All `requests.get()` calls in `services.py` use `timeout=int(os.getenv("REQUESTS_TIMEOUT", "10"))`.

---

## 6. Valuation Data Integration (Phase 8)

`fetch_valuation_data(isbn)` in `services.py`:
- Calls eBay Browse API with `gtin={isbn}`, `conditionIds:{3000|4000|5000}`, `limit=20`
- Requires `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` env vars
- Returns `{}` if credentials missing, fewer than 2 price points, or any error
- Populates `CatalogEntry.valuation_data` on entry creation (SELL status) and via `POST /api/entries/{id}/valuation/`

Shape of `valuation_data`:
```json
{
  "ebay": { "low": 4.99, "high": 18.00, "sample_size": 14, "fetched_at": "..." },
  "abebooks": { "low": 3.50, "median": 9.75, "high": 22.00, "sample_size": 8, "fetched_at": "..." },
  "booksrun": { "buyback_price": 2.50, "condition": "GOOD", "fetched_at": "..." }
}
```
Any key may be absent. Data older than 30 days is considered stale — the UI flags it.

---

## 7. `jsonref` Dependency Note

`jsonref` **must be explicitly installed** — it is a transitive dependency of `instructor` that isn't always pinned:
```bash
uv add jsonref
```
