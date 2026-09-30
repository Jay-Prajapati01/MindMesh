"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  const isChunkLoadError = error?.message?.includes("Loading chunk") || 
                           error?.message?.includes("dynamically imported");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      
      <h2 className="mb-2 text-xl font-semibold text-[#F5F5F5]">
        Something went wrong
      </h2>
      
      <p className="mb-2 max-w-md text-sm text-[#A1A1AA]">
        {error.message || "An unexpected error occurred."}
      </p>
      
      {error.digest && (
        <p className="mb-4 text-xs text-[#52525B]">
          Error ID: {error.digest}
        </p>
      )}
      
      {isChunkLoadError && (
        <p className="mb-4 text-xs text-yellow-500">
          This may be caused by a new deployment. Please hard refresh (Ctrl+Shift+R).
        </p>
      )}
      
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-[12px] bg-[#6E56CF] px-5 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-[#7C69E3]"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        
        <Link
          href="/"
          className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#111318] px-5 py-2.5 text-[13px] font-medium text-[#A1A1AA] transition-all hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5]"
        >
          <Home className="h-4 w-4" />
          Go home
        </Link>
      </div>
    </div>
  );
}
