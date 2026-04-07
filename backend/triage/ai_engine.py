"""AI Engine for BookBounty v2.

This module provides the integration with Gemini 2.5 Flash using the instructor
library to generate structured triage recommendations.
"""

import logging
import os
import time
from enum import Enum
from typing import TYPE_CHECKING, Any

import instructor
from google import genai
from google.genai.errors import ClientError
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from triage.models import CatalogEntry, CullingGoal

logger = logging.getLogger(__name__)


class TriageStatus(str, Enum):
    """Enumeration of possible triage outcomes."""

    KEEP = "KEEP"
    DONATE = "DONATE"
    SELL = "SELL"
    DISCARD = "DISCARD"


class TriageRecommendation(BaseModel):
    """Schema for the AI's structured recommendation."""

    status: TriageStatus = Field(description="The recommended outcome for the book.")
    confidence: float = Field(
        ge=0, le=1, description="Confidence score of the recommendation (0.0 to 1.0).",
    )
    reasoning: str = Field(description="A 1-sentence explanation for the user.")
    suggested_price: float | None = Field(
        None, description="Suggested asking price if status is SELL.",
    )
    marketplace_description: str | None = Field(
        None, description="A professional marketplace description if status is SELL.",
    )
    notable_tags: list[str] = Field(
        default_factory=list,
        description="Descriptive tags (e.g., 'Collectible', 'Outdated').",
    )
    is_fallback: bool = Field(
        default=False,
        description="True if returned by the fallback path (AI unavailable).",
    )


class BulkTriageRecommendation(TriageRecommendation):
    """Extends TriageRecommendation with a mapping to a catalog_entry_id."""

    catalog_entry_id: int = Field(description="The ID of the CatalogEntry being evaluated.")


class BulkRecommendationResponse(BaseModel):
    """Schema for the AI's structured bulk recommendation."""

    recommendations: list[BulkTriageRecommendation] = Field(
        description="A list of recommendations, one for each input book.",
    )


class ImpactNarrative(BaseModel):
    """Schema for the AI's structured impact narrative."""

    win_summary: str = Field(
        description="A 2-3 sentence encouraging and personalized summary of the user's progress.",
    )


# Initialize the client at module level to avoid redundant setup on every request.
_client = None


def get_instructor_client() -> Any:
    """Returns a shared instructor client instance.

    Returns:
        The instructor client instance, or None if the API key is missing.
    """
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment.")
        return None

    try:
        _client = instructor.from_genai(
            genai.Client(api_key=api_key),
            mode=instructor.Mode.GENAI_STRUCTURED_OUTPUTS,
        )
        return _client
    except Exception as exc:
        logger.error("Failed to initialize Gemini client: %s", exc)
        return None


def _call_gemini(
    client: Any,
    response_model: type[BaseModel],
    messages: list[dict[str, str]],
    max_retries: int = 3,
) -> Any:
    """Helper to call Gemini with robust error handling and retries.

    Args:
        client: The instructor client.
        response_model: The Pydantic model for the response.
        messages: List of message dictionaries.
        max_retries: Number of retries for rate limits.

    Returns:
        The structured response from Gemini.
    """
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model="gemini-2.5-flash",
                response_model=response_model,
                messages=messages,
            )
        except ClientError as exc:
            if exc.status_code == 429 and attempt < max_retries - 1:
                wait = 2**attempt
                logger.warning(
                    "Gemini rate limited. Retrying in %ds (attempt %d/%d).",
                    wait,
                    attempt + 1,
                    max_retries,
                )
                time.sleep(wait)
            else:
                logger.error(
                    "Gemini API error (Status: %s): %s",
                    getattr(exc, "status_code", "N/A"),
                    exc,
                )
                raise
        except Exception as exc:
            logger.error("Unexpected error in AI call: %s", exc)
            raise


def get_ai_recommendation(
    user_goal: str,
    book_metadata: dict[str, Any],
    condition: dict[str, Any],
) -> TriageRecommendation:
    """Calls Gemini to get a structured triage recommendation.

    Args:
        user_goal: The user's stated culling goal.
        book_metadata: Dictionary of book info (title, author, year, etc.).
        condition: Dictionary of physical condition (grade, flags).

    Returns:
        A TriageRecommendation object.
    """
    client = get_instructor_client()
    if not client:
        return TriageRecommendation(
            status=TriageStatus.KEEP,
            confidence=0.5,
            reasoning="AI engine unavailable (missing API key or init error). Defaulting to KEEP.",
            is_fallback=True,
        )

    system_prompt = (
        "You are an expert personal librarian and professional downsizing consultant. "
        "Your task is to analyze a book's metadata and physical condition against a "
        "user's specific 'Culling Goal'. You provide objective, high-utility "
        "recommendations to help the user achieve their goal efficiently. If the "
        "recommended status is SELL, you must also generate a professional, "
        "high-conversion marketplace description that incorporates the book's title, "
        "author, condition grade, and any condition flags."
    )

    title = book_metadata.get("title", "Unknown")
    author = book_metadata.get("author", "Unknown")
    year = book_metadata.get("year", "Unknown")
    subjects = ", ".join(book_metadata.get("subjects", [])) or "None listed"
    description = book_metadata.get("description", "").strip() or "No description available."
    grade = condition.get("grade", "Unknown")
    flags = ", ".join(condition.get("flags", [])) or "None"

    user_prompt = f"""
Culling Goal: {user_goal}

Book Metadata:
  Title: {title}
  Author: {author}
  Year: {year}
  Subjects: {subjects}
  Description: {description}

Physical Condition:
  Grade: {grade}
  Damage/Flags: {flags}

Provide a structured recommendation.
""".strip()

    return _call_gemini(
        client,
        TriageRecommendation,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )


def get_bulk_ai_recommendation(
    entries: list["CatalogEntry"],
    culling_goal: "CullingGoal",
) -> BulkRecommendationResponse:
    """Calls Gemini to get structured triage recommendations for multiple books.

    Args:
        entries: A list of CatalogEntry objects.
        culling_goal: The active CullingGoal object.

    Returns:
        A BulkRecommendationResponse object containing multiple recommendations.
    """
    client = get_instructor_client()
    if not client:
        return BulkRecommendationResponse(recommendations=[])

    system_prompt = (
        "You are an expert personal librarian and professional downsizing consultant. "
        "Your task is to analyze a set of books and provide triage recommendations "
        "based on a user's 'Culling Goal'. Perform a comparative analysis to decide "
        "which books are most valuable to KEEP versus those that should be SOLD, "
        "DONATED, or DISCARDED. For any book recommended for SALE, generate a "
        "professional, high-conversion marketplace description incorporating the "
        "title, author, condition grade, and any condition flags."
    )

    books_data = []
    for entry in entries:
        book = entry.book
        books_data.append(
            f"""
Entry ID: {entry.id}
Title: {book.title}
Author: {book.author}
Year: {book.publish_year}
Subjects: {", ".join(book.subjects)}
Description: {book.description}
Condition: {entry.condition_grade} (Flags: {", ".join(entry.condition_flags)})
""".strip(),
        )

    user_prompt = f"""
Culling Goal: {culling_goal.description}

Books to Triage:
---
{"\n---\n".join(books_data)}
---

Perform a comparative analysis and provide a structured recommendation for EACH entry ID provided.
""".strip()

    return _call_gemini(
        client,
        BulkRecommendationResponse,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )


def get_impact_narrative(stats_data: dict[str, Any]) -> ImpactNarrative:
    """Generates an encouraging summary of the user's culling impact.

    Args:
        stats_data: Dictionary containing:
            - resolved_counts: dict of status -> count
            - space_saved: float (e.g., in feet or meters)
            - money_earned: float (potential or actual)

    Returns:
        An ImpactNarrative object.
    """
    resolved_counts = stats_data.get("resolved_counts", {})
    total_resolved = sum(resolved_counts.values())

    # Handle sparse data
    if total_resolved == 0:
        return ImpactNarrative(
            win_summary="You haven't resolved any books yet. Keep going! Every book you triage brings you closer to your goal.",
        )

    client = get_instructor_client()
    if not client:
        return ImpactNarrative(
            win_summary=f"You've resolved {total_resolved} books so far! Keep up the great work.",
        )

    system_prompt = (
        "You are an encouraging personal organization coach. Your goal is to "
        "motivate the user by summarizing the positive impact of their book culling "
        "efforts based on provided statistics. Be warm, professional, and focus on the wins."
    )

    space_saved = stats_data.get("space_saved", 0)
    money_earned = stats_data.get("money_earned", 0)

    user_prompt = f"""
User's Progress Stats:
- Total Books Resolved: {total_resolved}
- Breakdown: {resolved_counts}
- Shelf Space Reclaimed: {space_saved} feet
- Potential/Actual Earnings: ${money_earned}

Generate a 2-3 sentence encouraging 'Win Summary' that personalizes these achievements.
""".strip()

    return _call_gemini(
        client,
        ImpactNarrative,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
