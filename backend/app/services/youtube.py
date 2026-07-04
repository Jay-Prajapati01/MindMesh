"""YouTube ingestion: metadata + transcript with Whisper fallback."""
from __future__ import annotations

import re

from app.core.logging import get_logger
from app.models.schemas import VideoMetadata

logger = get_logger(__name__)

_YT_ID_RE = re.compile(
    r"(?:v=|/shorts/|youtu\.be/|/embed/)([0-9A-Za-z_-]{11})"
)


def extract_video_id(url: str) -> str:
    """Extract the 11-char YouTube video id from a URL or raw id."""
    match = _YT_ID_RE.search(url)
    if match:
        return match.group(1)
    if re.fullmatch(r"[0-9A-Za-z_-]{11}", url):
        return url
    raise ValueError(f"Could not extract a video id from: {url}")


def fetch_metadata(url: str) -> VideoMetadata:
    """Fetch video metadata using yt-dlp (no download)."""
    import yt_dlp

    video_id = extract_video_id(url)
    opts = {"quiet": True, "skip_download": True, "no_warnings": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        try:
            info = ydl.extract_info(
                f"https://www.youtube.com/watch?v={video_id}", download=False
            )
        except Exception:
            logger.warning("yt_dlp metadata fetch failed for %s, falling back to oEmbed", video_id)
            # lightweight fallback to oEmbed (title, author, thumbnail)
            try:
                import httpx

                oembed_url = (
                    f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
                )
                resp = httpx.get(oembed_url, timeout=10.0)
                resp.raise_for_status()
                data = resp.json()
                info = {
                    "title": data.get("title"),
                    "uploader": data.get("author_name"),
                    "thumbnail": data.get("thumbnail_url"),
                }
            except Exception:
                # Re-raise original error if fallback also fails
                raise
    return VideoMetadata(
        video_id=video_id,
        title=info.get("title"),
        channel=info.get("uploader") or info.get("channel"),
        duration=info.get("duration"),
        thumbnail=info.get("thumbnail"),
        published_at=info.get("upload_date"),
    )


def fetch_transcript(video_id: str) -> str:
    """Fetch transcript via the transcript API, else fall back to Whisper."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        ytt = YouTubeTranscriptApi()
        fetched = ytt.fetch(video_id)
        text = " ".join(snippet.text for snippet in fetched).strip()
        if text:
            logger.info("Transcript fetched via API for %s", video_id)
            return text
    except Exception as exc:  # noqa: BLE001
        logger.warning("Transcript API failed for %s: %s", video_id, exc)

    try:
        return _whisper_transcribe(video_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("Whisper transcription also failed for %s: %s", video_id, exc)
        raise ValueError(
            f"Could not retrieve transcript for video {video_id}. "
            "The video may not have captions and audio download failed."
        ) from exc


def _whisper_transcribe(video_id: str) -> str:
    """Download audio with yt-dlp and transcribe with faster-whisper."""
    import tempfile
    from pathlib import Path

    import yt_dlp
    from faster_whisper import WhisperModel

    logger.info("Falling back to Whisper for %s", video_id)
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "audio.%(ext)s"
        opts = {
            "quiet": True,
            "no_warnings": True,
            "format": "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio/best",
            "outtmpl": str(out),
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                }
            ],
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
        audio_path = next(Path(tmp).glob("audio.*"))
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, _ = model.transcribe(str(audio_path))
        return " ".join(seg.text for seg in segments).strip()
