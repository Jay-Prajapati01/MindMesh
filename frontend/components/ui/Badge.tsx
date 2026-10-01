import { HTMLAttributes } from "react";

export function Badge({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-block rounded-full bg-brand-soft border border-brand/20 px-2.5 py-0.5 text-xs font-medium text-brand ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
