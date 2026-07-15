import { cn } from "../../lib/utils.js";

export function ProgressBar({ value = 0, label, className }) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
        <span>{label || "Progress"}</span>
        <span className="text-slate-700">{percent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
