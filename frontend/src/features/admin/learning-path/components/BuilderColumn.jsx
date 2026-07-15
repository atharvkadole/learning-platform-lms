import { Card, CardHeader } from "../../../../components/ui/Card.jsx";
import { cn } from "../../../../lib/utils.js";

export function BuilderColumn({ title, description, action, children, disabled = false }) {
  return (
    <Card className={cn("min-h-[520px]", disabled && "opacity-60")}>
      <CardHeader title={title} description={description} action={action} />
      {children}
    </Card>
  );
}

export function EmptyStep({ title, description }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
