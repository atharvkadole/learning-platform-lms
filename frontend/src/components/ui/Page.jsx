import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./Button.jsx";
import { Card } from "./Card.jsx";

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ title = "Loading", description = "Fetching the latest data." }) {
  return (
    <Card className="grid min-h-48 place-items-center text-center">
      <div>
        <Loader2 className="mx-auto mb-3 animate-spin text-blue-600" size={24} />
        <p className="font-medium text-slate-950">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </Card>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry }) {
  return (
    <Card className="grid min-h-48 place-items-center text-center">
      <div>
        <AlertCircle className="mx-auto mb-3 text-red-600" size={24} />
        <p className="font-medium text-slate-950">{title}</p>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        {onRetry ? (
          <Button className="mt-4" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="lms-soft rounded-2xl border border-dashed p-8 text-center">
      <p className="font-medium text-slate-950">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
