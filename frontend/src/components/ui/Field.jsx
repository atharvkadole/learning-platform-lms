import { cn } from "../../lib/utils.js";

export function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "focus-ring h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm placeholder:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn("focus-ring h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "focus-ring min-h-24 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm placeholder:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}
