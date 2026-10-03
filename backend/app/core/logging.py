"""Structured application logging."""
import logging
import sys

from app.core.config import get_settings


def configure_logging() -> None:
    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def safe_log_str(value: str, max_len: int = 200) -> str:
    """Sanitize a string for safe logging: strip control characters and truncate."""
    if not value:
        return ""
    # Strip control characters (except tab, newline, carriage return)
    cleaned = "".join(ch if ch >= " " or ch in "\t\n\r" else "\\u{:04x}".format(ord(ch)) for ch in value)
    if len(cleaned) > max_len:
        cleaned = cleaned[:max_len] + "..."
    return cleaned
