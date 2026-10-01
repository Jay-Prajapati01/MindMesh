"use client";

import { useState } from "react";

interface ThumbImageProps {
  src?: string | null;
  alt?: string;
  /** Classes for the rendered <img>. */
  className?: string;
  /** Classes for the fallback placeholder (should match size classes). */
  fallbackClassName?: string;
}

/**
 * Thumbnail that degrades gracefully when the remote CDN rejects the hotlink
 * (Instagram CDN returns 403 for embedded thumbnails) instead of showing a
 * broken-image icon.
 */
export function ThumbImage({
  src,
  alt = "",
  className = "",
  fallbackClassName = "",
}: ThumbImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={`flex items-center justify-center bg-gradient-to-br from-[#1A1C24] to-[#111318] ${className} ${fallbackClassName}`}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
