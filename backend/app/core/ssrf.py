"""SSRF protection for outbound HTTP fetches.

Every user-supplied URL (web ingestion, PDF URLs) is validated before the
request and re-validated after each redirect hop. Resolved addresses are
checked against loopback/private/link-local/reserved ranges for IPv4 and
IPv6 (including IPv4-mapped addresses).

Set SSRF_BLOCK_PRIVATE=false only when you intentionally ingest pages from
internal addresses (trusted, isolated environments).
"""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Hostnames that always designate internal/cloud-metadata services.
_ALWAYS_BLOCKED_HOSTS = {
    "localhost",
    "metadata.google.internal",
    "metadata.goog",
    "instance-data",
}


class SSRFBlockedError(ValueError):
    """URL points at a blocked/internal address (subclasses ValueError so
    existing `except ValueError` handlers map it to a clean 400/step_fail)."""


def _ip_blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(ip, ipaddress.IPv6Address):
        mapped = ip.ipv4_mapped
        if mapped is not None:
            ip = mapped
    return (
        ip.is_loopback
        or ip.is_link_local
        or ip.is_private
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
        or not ip.is_global
    )


def validate_public_url(url: str) -> None:
    """Raise SSRFBlockedError when *url* must not be fetched."""
    settings = get_settings()
    if not settings.ssrf_block_private:
        return

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise SSRFBlockedError("Only http:// and https:// URLs are allowed")
    host = parsed.hostname
    if not host:
        raise SSRFBlockedError("URL has no hostname")

    low = host.lower().rstrip(".")
    if (
        low in _ALWAYS_BLOCKED_HOSTS
        or low.endswith(".localhost")
        or low.endswith(".local")
    ):
        raise SSRFBlockedError(f"Fetching from internal hosts is not allowed: {host}")

    try:
        infos = socket.getaddrinfo(host, parsed.port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise SSRFBlockedError(f"Could not resolve host: {host}") from exc
    if not infos:
        raise SSRFBlockedError(f"Could not resolve host: {host}")

    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            continue
        if _ip_blocked(ip):
            raise SSRFBlockedError(
                f"Fetching from internal/private addresses is not allowed: {host}"
            )


async def safe_get(
    url: str,
    *,
    timeout: float,
    headers: dict | None = None,
    max_redirects: int = 5,
    max_bytes: int | None = None,
) -> tuple[int, bytes, str]:
    """GET *url* with SSRF revalidation on every redirect hop and a hard cap
    on the response body size (unbounded `resp.text` was a memory-DoS).

    Returns (status_code, body_bytes, final_url).
    """
    settings = get_settings()
    if max_bytes is None:
        max_bytes = settings.fetch_max_bytes

    current = url
    async with httpx.AsyncClient(
        timeout=timeout, follow_redirects=False, headers=headers
    ) as client:
        for _hop in range(max_redirects + 1):
            validate_public_url(current)
            async with client.stream("GET", current) as resp:
                if resp.status_code in (301, 302, 303, 307, 308):
                    location = resp.headers.get("location")
                    if not location:
                        raise RuntimeError("Redirect without Location header")
                    from urllib.parse import urljoin

                    current = urljoin(current, location)
                    continue
                if resp.status_code >= 400:
                    raise RuntimeError(
                        f"HTTP {resp.status_code} fetching {urlparse(current).netloc}"
                    )
                buf = bytearray()
                async for chunk in resp.aiter_bytes():
                    buf.extend(chunk)
                    if len(buf) > max_bytes:
                        raise RuntimeError(
                            f"Response exceeded the {max_bytes} byte fetch limit"
                        )
                return resp.status_code, bytes(buf), str(resp.url)
    raise RuntimeError("Too many redirects")
