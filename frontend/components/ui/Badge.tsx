import { HTMLAttributes } from "react";

export function Badge({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-block rounded-full bg-brand/20 px-2.5 py-0.5 text-xs text-brand ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
