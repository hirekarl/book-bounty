"""Services for the triage application.

This module contains business logic for looking up book metadata from the
Open Library API and determining suggested triage outcomes.
"""

import base64
import logging
import os
import re
import time
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.files.base import ContentFile

from triage.models import Book, CatalogEntry

logger = logging.getLogger(__name__)

_ebay_token: str | None = None
_ebay_token_expiry: float = 0.0


def _get_ebay_token() -> str | None:
    """Returns a valid eBay OAuth client-credentials token, fetching one if needed.

    Reads EBAY_CLIENT_ID and EBAY_CLIENT_SECRET from the environment. Returns
    None gracefully if credentials are absent or the request fails.

    Returns:
        A bearer token string, or None if unavailable.
    """
    global _ebay_token, _ebay_token_expiry

    client_id = os.getenv("EBAY_CLIENT_ID")
    client_secret = os.getenv("EBAY_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None

    if _ebay_token and time.time() < _ebay_token_expiry:
        return _ebay_token

    try:
        credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        timeout = int(os.getenv("REQUESTS_TIMEOUT", "10"))
        response = requests.post(
            "https://api.ebay.com/identity/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "client_credentials",
                "scope": "https://api.ebay.com/oauth/api_scope",
            },
            timeout=timeout,
        )
        response.raise_for_status()
        payload = response.json()
        _ebay_token = payload["access_token"]
        _ebay_token_expiry = time.time() + payload["expires_in"] - 60
        return _ebay_token
    except Exception:
        logger.warning("Failed to obtain eBay OAuth token", exc_info=True)
        return None


def fetch_valuation_data(isbn: str) -> dict:
    """Fetches eBay sold-listing price data for a book by ISBN (GTIN).

    Uses the eBay Browse API item_summary/search endpoint filtered to used
    condition IDs (3000, 4000, 5000). Returns an empty dict if credentials are
    absent, fewer than 2 price data points are available, or any error occurs.

    Args:
        isbn: The book's ISBN (used as the GTIN query parameter).

    Returns:
        A dict with an "ebay" key containing low, high, sample_size, and
        fetched_at fields, or an empty dict on failure / insufficient data.
    """
    token = _get_ebay_token()
    if token is None:
        return {}

    try:
        timeout = int(os.getenv("REQUESTS_TIMEOUT", "10"))
        response = requests.get(
            "https://api.ebay.com/buy/browse/v1/item_summary/search",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "gtin": isbn,
                "filter": "conditionIds:{3000|4000|5000}",
                "limit": 20,
            },
            timeout=timeout,
        )
        response.raise_for_status()
        items = response.json().get("itemSummaries", [])
        prices = [
            float(item["price"]["value"])
            for item in items
            if "price" in item
        ]
        if len(prices) < 2:
            return {}
        return {
            "ebay": {
                "low": round(min(prices), 2),
                "high": round(max(prices), 2),
                "sample_size": len(prices),
                "fetched_at": datetime.now(tz=UTC).isoformat(),
            },
        }
    except (requests.RequestException, ValueError, KeyError):
        logger.warning(
            "Failed to fetch eBay valuation data for ISBN %s", isbn, exc_info=True,
        )
        return {}


def download_cover_image(book: Book, url: str) -> None:
    """Downloads a cover image from a URL and saves it to the book model.

    Args:
        book: The Book instance to update.
        url: The URL of the image to download.
    """
    if not url:
        return

    try:
        response = requests.get(url, timeout=int(os.getenv("REQUESTS_TIMEOUT", "10")))
        response.raise_for_status()

        # Extract filename from URL
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        
        # Check if filename has an extension
        _, ext = os.path.splitext(filename)
        if not ext:
            # Try to determine extension from Content-Type header
            content_type = response.headers.get("Content-Type", "")
            if "image/jpeg" in content_type:
                ext = ".jpg"
            elif "image/png" in content_type:
                ext = ".png"
            elif "image/gif" in content_type:
                ext = ".gif"
            else:
                ext = ".jpg"  # Default fallback
            
            if not filename:
                filename = f"cover_{book.isbn}{ext}"
            else:
                filename = f"{filename}{ext}"

        book.cover_image.save(filename, ContentFile(response.content), save=True)
    except requests.RequestException as e:
        logger.error("Failed to download cover image for ISBN %s: %s", book.isbn, e)
    except Exception:
        logger.exception(
            "Unexpected error downloading cover image for ISBN %s", book.isbn,
        )


def fetch_book_metadata(isbn: str) -> dict[str, Any]:
    """Fetches book metadata from the Open Library API.

    Args:
        isbn: The ISBN of the book to look up.

    Returns:
        A dictionary containing book metadata (title, author, publish_year, subjects).

    Raises:
        requests.RequestException: If the API request fails.
    """
    contact_email = getattr(settings, "OPEN_LIBRARY_CONTACT", "anonymous@example.com")
    headers = {"User-Agent": f"BookBounty/1.0 ({contact_email})"}
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"

    timeout = int(os.getenv("REQUESTS_TIMEOUT", "10"))
    response = requests.get(url, headers=headers, timeout=timeout)
    response.raise_for_status()
    data = response.json()

    bib_key = f"ISBN:{isbn}"
    if bib_key not in data:
        return {}

    book_data = data[bib_key]
    authors = ", ".join([a["name"] for a in book_data.get("authors", [])])
    publish_date = book_data.get("publish_date", "")
    # Try to extract year from publish_date string
    publish_year = None
    if publish_date:
        year_match = re.search(r"\d{4}", publish_date)
        if year_match:
            publish_year = int(year_match.group())

    subjects = [s["name"] for s in book_data.get("subjects", [])]
    page_count = book_data.get("number_of_pages")
    cover_data = book_data.get("cover", {})
    cover_url = (
        cover_data.get("medium")
        or cover_data.get("large")
        or cover_data.get("small")
    )

    return {
        "isbn": isbn,
        "title": book_data.get("title", "Unknown Title"),
        "author": authors or "Unknown Author",
        "publish_year": publish_year,
        "subjects": subjects,
        "page_count": page_count,
        "cover_url": cover_url,
        "description": book_data.get("notes", ""),
    }


def get_or_create_book(isbn: str) -> tuple[Book, bool]:
    """Retrieves a book from the local database or fetches and caches it.

    Args:
        isbn: The ISBN of the book.

    Returns:
        A tuple of (Book instance, created boolean).
    """
    book = Book.objects.filter(isbn=isbn).first()
    if book:
        # Single Pull mandate: download if cover_image is not set
        if not book.cover_image and book.cover_url:
            download_cover_image(book, book.cover_url)
        return book, False

    metadata = fetch_book_metadata(isbn)
    if not metadata:
        # Create a placeholder if not found
        return (
            Book.objects.create(isbn=isbn, title="Unknown Book", author="Unknown"),
            True,
        )

    book = Book.objects.create(
        isbn=isbn,
        title=metadata["title"],
        author=metadata["author"],
        publish_year=metadata["publish_year"],
        subjects=metadata["subjects"],
        page_count=metadata["page_count"],
        cover_url=metadata["cover_url"],
        description=metadata["description"],
    )

    if metadata["cover_url"]:
        download_cover_image(book, metadata["cover_url"])

    return book, True


def suggest_triage_outcome(condition_flags: list[str]) -> str:
    """Suggests a triage outcome based on condition flags.

    Args:
        condition_flags: A list of strings representing physical condition issues.

    Returns:
        A string representing the suggested status (DISCARD or KEEP).
    """
    # Simple logic: if any condition flags are present, suggest DISCARD.
    if condition_flags:
        return CatalogEntry.Status.DISCARD
    return CatalogEntry.Status.KEEP


def calculate_spatial_roi(page_count: int | None) -> float:
    """Calculates the estimated physical space recovered in inches.

    Formula: 100 pages ≈ 0.25 inches.
    If page_count is missing, default to 1.0 inch.

    Args:
        page_count: The number of pages in the book.

    Returns:
        The estimated thickness in inches.
    """
    if not page_count:
        return 1.0
    return (page_count / 100.0) * 0.25
