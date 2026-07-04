"""Web ingestion: fetch a page and extract readable article text.

Uses Crawl4AI for browser-based fetching with JavaScript rendering,
anti-bot handling, and clean LLM-ready Markdown extraction.
Falls back to httpx when Crawl4AI returns insufficient content.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse, urljoin

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_YT_VIDEO_RE = re.compile(r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/|youtube\.com/embed/)([0-9A-Za-z_-]{11})")
_YT_CHANNEL_RE = re.compile(r"https?://(?:www\.)?youtube\.com/@")
_YT_PLAYLIST_RE = re.compile(r"youtube\.com/playlist\?list=")
_PDF_RE = re.compile(r"\.pdf(?:\?|$)", re.IGNORECASE)
_IMAGE_RE = re.compile(r"\.(?:jpg|jpeg|png|gif|webp|svg|bmp|tiff)(?:\?|$)", re.IGNORECASE)


def _normalize_url(url: str) -> str:
    """Normalize URL for consistent source_id generation."""
    parsed = urlparse(url)
    # Strip trailing slash from path, lowercase scheme and host
    path = parsed.path.rstrip("/") or "/"
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}{path}"


def _is_youtube_video(url: str) -> bool:
    return bool(_YT_VIDEO_RE.search(url))


def _is_youtube_homepage(url: str) -> bool:
    return bool(re.match(r"https?://(?:www\.)?youtube\.com/?$", url.strip()))


def _is_youtube_channel(url: str) -> bool:
    return bool(_YT_CHANNEL_RE.search(url))


def _is_youtube_playlist(url: str) -> bool:
    return bool(_YT_PLAYLIST_RE.search(url))


def _is_pdf_url(url: str) -> bool:
    return bool(_PDF_RE.search(url))


def _is_image_url(url: str) -> bool:
    return bool(_IMAGE_RE.search(url))


async def fetch_article(url: str) -> dict:
    """Fetch and extract the main article from a URL using Crawl4AI.

    Returns a dict with keys: url, title, text.
    """
    if not url.startswith(("http://", "https://")):
        raise ValueError("URL must start with http:// or https://")

    # Handle YouTube video URLs via transcript API
    if _is_youtube_video(url):
        return await _fetch_youtube_video(url)

    # Handle YouTube homepage (no real article content)
    if _is_youtube_homepage(url):
        return {
            "url": url,
            "title": "YouTube",
            "text": (
                "YouTube is a video-sharing platform where users can upload, view, "
                "and share videos. It was created in 2005 and acquired by Google in 2006. "
                "The platform hosts a wide variety of content including music videos, "
                "tutorial videos, vlogs, news, entertainment, and educational content. "
                "Users can subscribe to channels, like videos, leave comments, and create playlists. "
                "YouTube also offers YouTube Premium for ad-free viewing and YouTube Music for music streaming."
            ),
        }

    # Handle YouTube channel URLs
    if _is_youtube_channel(url):
        channel_name = urlparse(url).path.split("@")[-1].split("/")[0] if "@" in url else "channel"
        return {
            "url": url,
            "title": f"YouTube Channel: {channel_name}",
            "text": (
                f"YouTube channel '{channel_name}'. This is a channel page on YouTube. "
                "To get specific video content, please provide a direct video URL "
                "(e.g., youtube.com/watch?v=VIDEO_ID)."
            ),
        }

    # Handle YouTube playlist URLs
    if _is_youtube_playlist(url):
        return {
            "url": url,
            "title": "YouTube Playlist",
            "text": (
                "This is a YouTube playlist. To get specific video content, "
                "please provide a direct video URL (e.g., youtube.com/watch?v=VIDEO_ID)."
            ),
        }

    # Handle PDF URLs - extract text from PDF
    if _is_pdf_url(url):
        return await _fetch_pdf_url(url)

    # Handle image URLs - not processable as text
    if _is_image_url(url):
        raise ValueError("Image URLs cannot be processed as text content. Please provide a web page URL.")

    settings = get_settings()

    text = ""
    title = url

    # Try httpx first (fast, no browser needed)
    try:
        text, title = await _fetch_with_httpx(url)
    except Exception as exc:
        logger.info("httpx failed for %s: %s", url, exc)

    # If httpx got too little content, try Crawl4AI (browser-based, slower)
    if len(text) < 100:
        logger.info("Content too short from httpx (%d chars), trying Crawl4AI", len(text))
        text = ""
        try:
            from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

            browser_config = BrowserConfig(
                headless=settings.crawl4ai_headless,
                verbose=False,
            )
            cache_mode = CacheMode.BYPASS if settings.crawl4ai_cache_mode == "bypass" else CacheMode.ENABLED

            run_config = CrawlerRunConfig(
                cache_mode=cache_mode,
                word_count_threshold=10,
            )

            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(url, config=run_config)

            if result.success and result.markdown:
                fit = getattr(result.markdown, "fit_markdown", None) or ""
                raw = getattr(result.markdown, "raw_markdown", None) or ""
                text = (fit if len(fit.strip()) >= 50 else raw).strip()

                if result.metadata and isinstance(result.metadata, dict):
                    title = result.metadata.get("title", "") or result.metadata.get("description", "") or title
            elif not result.success:
                logger.warning("Crawl4AI reported failure for %s: %s", url, result.error_message)
        except Exception as exc:
            logger.warning("Crawl4AI failed for %s: %s", url, exc)

    if not text.strip():
        raise RuntimeError(f"Could not extract readable content from {url}")

    return {"url": url, "title": title, "text": text}


async def _fetch_with_httpx(url: str) -> tuple[str, str]:
    """Fallback fetcher using httpx + basic HTML parsing."""
    import httpx

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        )
    }

    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=headers) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        html = resp.text

    # Extract title
    title = url
    title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, re.IGNORECASE)
    if title_match:
        title = title_match.group(1).strip()

    # Simple text extraction: strip tags, collapse whitespace
    text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text, title


async def _fetch_youtube_video(url: str) -> dict:
    """Fetch YouTube video metadata and transcript."""
    from app.services.youtube import extract_video_id, fetch_metadata, fetch_transcript

    video_id = extract_video_id(url)

    # Metadata and transcript are independent — fail gracefully on each
    title = f"YouTube Video {video_id}"
    try:
        metadata = fetch_metadata(url)
        if metadata.title:
            title = metadata.title
    except Exception as exc:
        logger.warning("YouTube metadata failed for %s: %s", video_id, exc)

    transcript = ""
    try:
        transcript = fetch_transcript(video_id)
    except Exception as exc:
        logger.warning("YouTube transcript failed for %s: %s", video_id, exc)

    if not transcript:
        raise RuntimeError(
            f"Could not retrieve transcript for YouTube video {video_id}. "
            "The video may not have captions."
        )

    return {"url": url, "title": title, "text": transcript}


async def _fetch_pdf_url(url: str) -> dict:
    """Download and extract text from a PDF URL."""
    import tempfile
    from pathlib import Path

    import httpx

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        )
    }

    async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers=headers) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(resp.content)
        tmp_path = tmp.name

    try:
        import pymupdf

        doc = pymupdf.open(tmp_path)
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())

        # Extract metadata BEFORE closing the document
        title = url
        try:
            metadata = doc.metadata
            if metadata and metadata.get("title"):
                title = metadata["title"]
        except Exception:
            pass

        doc.close()
        text = "\n".join(text_parts).strip()

        if title == url and text_parts:
            first_line = text_parts[0].split("\n")[0].strip()
            if 10 < len(first_line) < 100:
                title = first_line

        return {"url": url, "title": title, "text": text}
    finally:
        import os
        os.unlink(tmp_path)
