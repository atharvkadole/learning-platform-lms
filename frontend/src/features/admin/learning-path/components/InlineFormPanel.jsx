import { X } from "lucide-react";
import { Button } from "../../../../components/ui/Button.jsx";

export function InlineFormPanel({ title, children, onCancel }) {
  return (
    <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <Button variant="ghost" className="h-8 px-2" onClick={onCancel}>
          <X size={16} />
        </Button>
      </div>
      {children}
    </div>
  );
}
