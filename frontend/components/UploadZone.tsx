"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, CheckCircle } from "lucide-react";

export function UploadZone({
  file,
  accept,
  label,
  onSelect,
  disabled = false,
}: {
  file: File | null;
  accept: string;
  label: string;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragging(false);
      if (disabled) return;
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        onSelect(droppedFile);
      }
    },
    [disabled, onSelect]
  );

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelect(e.target.files?.[0] ?? null);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        ${dragging
          ? "border-[#6E56CF] bg-[#6E56CF]/[0.08] shadow-[0_0_30px_rgba(110,86,207,0.15)]"
          : file
            ? "border-[#22C55E]/40 bg-[#22C55E]/[0.04] hover:border-[#22C55E]/60"
            : "border-white/20 bg-white/5 hover:border-[#6E56CF]/50 hover:bg-[#6E56CF]/[0.03]"
        }
      `}
    >
      {dragging && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-[#6E56CF]/[0.06] backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-[#6E56CF] animate-bounce" />
            <span className="text-[13px] font-medium text-[#6E56CF]">Drop your file here</span>
          </div>
        </div>
      )}
      {file ? (
        <>
          <CheckCircle className="h-6 w-6 text-[#22C55E]" />
          <span className="text-sm text-[#A1A1AA]">{file.name}</span>
          <span className="text-[11px] text-[#52525B]">Click or drop to replace</span>
        </>
      ) : (
        <>
          <Upload className={`h-6 w-6 ${dragging ? "text-[#6E56CF]" : "text-[#6E56CF]"}`} />
          <span className="text-sm text-[#71717A]">{label}</span>
          <span className="text-[11px] text-[#52525B]">PDF files supported</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />
    </div>
  );
}
