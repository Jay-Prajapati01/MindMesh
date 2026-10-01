import { HTMLAttributes } from "react";

export function Card({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 text-foreground shadow-card transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
