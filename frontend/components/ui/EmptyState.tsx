import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
      {icon && <div className="mb-3 text-brand">{icon}</div>}
      <p className="text-sm font-medium text-gray-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
