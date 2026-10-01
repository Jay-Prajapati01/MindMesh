"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cleanLabel } from "./graphModel";

export interface ConceptData {
  label: string;
  count: number;
  degree: number;
  color: string;
  hub: boolean;
  dim: boolean;
  active: boolean;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function ConceptNodeInner({ data, selected }: NodeProps<ConceptData>) {
  const { label, count, degree, color, hub, dim, active } = data;
  const on = active || selected;
  const clean = cleanLabel(label);
  const display = truncate(clean, hub ? 46 : 30);

  return (
    <div
      title={`${clean}\n${degree} connection${degree === 1 ? "" : "s"}${
        count > 1 ? ` · mentioned ${count}×` : ""
      }`}
      aria-label={`Concept: ${clean}, ${degree} connections`}
      className={`flex max-w-[260px] items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-all duration-200 ${
        hub ? "text-[13px]" : "text-xs"
      } ${on ? "font-medium" : "font-normal"}`}
      style={{
        borderColor: on ? color : `${color}80`,
        background: hub
          ? `linear-gradient(135deg, ${color}59 0%, rgba(26,28,40,0.96) 65%)`
          : `linear-gradient(135deg, ${color}30 0%, rgba(24,26,38,0.95) 65%)`,
        color: dim ? "#52525B" : "#F5F5F5",
        opacity: dim ? 0.3 : 1,
        boxShadow: on
          ? `0 0 0 3px ${color}33, 0 0 22px ${color}66`
          : hub
            ? `0 0 14px ${color}40`
            : "0 2px 8px rgba(0,0,0,0.45)",
        zIndex: on ? 5 : dim ? 0 : hub ? 2 : 1,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="pointer-events-none !opacity-0"
      />
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color, boxShadow: on ? `0 0 6px ${color}` : "none" }}
      />
      <span className="whitespace-nowrap">{display}</span>
      {count > 1 && (
        <span
          className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold tabular-nums"
          style={{ background: `${color}2e`, color: color }}
        >
          {count}
        </span>
      )}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="pointer-events-none !opacity-0"
      />
    </div>
  );
}

export const ConceptNode = memo(ConceptNodeInner);
