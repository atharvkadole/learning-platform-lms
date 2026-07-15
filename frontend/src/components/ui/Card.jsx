import { cn } from "../../lib/utils.js";

export function Card({ className, ...props }) {
  return <div className={cn("premium-card rounded-2xl border p-5", className)} {...props} />;
}

export function CardHeader({ title, description, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
