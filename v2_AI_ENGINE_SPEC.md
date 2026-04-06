# BookBounty v2: AI Engine Specification

## 1. Technical Stack
- **Model:** Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Library:** `instructor` (for structured outputs)
- **SDK:** `google-genai` (Google's official Python SDK)

## 2. Structured Data Schema (Pydantic)
The engine will use Pydantic models to ensure Gemini returns valid, parseable JSON that aligns with our database.

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class TriageStatus(str, Enum):
    KEEP = "KEEP"
    DONATE = "DONATE"
    SELL = "SELL"
    DISCARD = "DISCARD"

class TriageRecommendation(BaseModel):
    status: TriageStatus = Field(description="The recommended outcome for the book.")
    confidence: float = Field(ge=0, le=1, description="Confidence score of the recommendation.")
    reasoning: str = Field(description="A 1-sentence explanation for the user.")
    suggested_price: Optional[float] = Field(None, description="Suggested asking price if status is SELL.")
    notable_tags: List[str] = Field(default_factory=list, description="Descriptive tags (e.g., 'Collectible', 'Outdated').")
```

## 3. Prompt Architecture

### System Prompt (Context)
> "You are an expert personal librarian and professional downsizing consultant. Your task is to analyze a book's metadata and physical condition against a user's specific 'Culling Goal'. You provide objective, high-utility recommendations to help the user achieve their goal efficiently."

### Input Data Structure
The backend will provide a JSON blob containing:
- `user_goal`: (e.g., "Minimalist - Reduce by 80%")
- `book_metadata`: { title, author, year, subjects, description }
- `condition`: { grade, flags }

## 4. API Integration Strategy
1.  **Endpoint:** `POST /api/recommend/`
2.  **Logic:**
    - Receive ISBN and current Culling Goal ID.
    - Fetch/Update local Book metadata.
    - Call Gemini via `instructor`.
    - Return the `TriageRecommendation` object to the frontend.

## 5. Error Handling & Fallbacks
- **Rate Limiting:** Implement backoff logic for Gemini API.
- **Empty Metadata:** If Open Library fails, AI should still attempt a guess based on the title or flag for human review.
- **Low Confidence:** Recommendations with confidence < 0.5 should be visually flagged in the UI as "AI Uncertain."
