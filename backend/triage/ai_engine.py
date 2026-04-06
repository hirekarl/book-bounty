"""AI Engine for BookBounty v2.

This module provides the integration with Gemini 2.5 Flash using the instructor
library to generate structured triage recommendations.
"""

import logging
import os
import time
from enum import Enum
from typing import Any

import instructor
from google import genai
from google.genai.errors import ClientError
from pydantic import BaseModel, Field

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
        ge=0, le=1, description="Confidence score of the recommendation (0.0 to 1.0)."
    )
    reasoning: str = Field(description="A 1-sentence explanation for the user.")
    suggested_price: float | None = Field(
        None, description="Suggested asking price if status is SELL."
    )
    notable_tags: list[str] = Field(
        default_factory=list,
        description="Descriptive tags (e.g., 'Collectible', 'Outdated').",
    )


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
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return TriageRecommendation(
            status=TriageStatus.KEEP,
            confidence=0.5,
            reasoning="API key missing. Defaulting to KEEP for safety.",
        )

    client = instructor.from_genai(
        genai.Client(api_key=api_key),
        mode=instructor.Mode.GENAI_STRUCTURED_OUTPUTS,
    )

    system_prompt = (
        "You are an expert personal librarian and professional downsizing consultant. "
        "Your task is to analyze a book's metadata and physical condition against a user's "
        "specific 'Culling Goal'. You provide objective, high-utility recommendations to help "
        "the user achieve their goal efficiently."
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

    max_retries = 3
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model="gemini-2.5-flash-latest",
                response_model=TriageRecommendation,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
        except ClientError as exc:
            if exc.status_code == 429 and attempt < max_retries - 1:
                wait = 2 ** attempt
                logger.warning("Gemini rate limited. Retrying in %ds (attempt %d/%d).", wait, attempt + 1, max_retries)
                time.sleep(wait)
            else:
                raise
