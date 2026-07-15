import { Check, Edit2, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/Button.jsx";
import { cn } from "../../../../lib/utils.js";

export function EntityList({ items, selectedId, getTitle, getDescription, getMeta, onSelect, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const selected = selectedId === item.id;
        return (
          <div
            key={item.id}
            className={cn(
              "rounded-md border bg-white p-3 transition",
              selected ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300",
            )}
          >
            <button type="button" className="w-full text-left" onClick={() => onSelect(item)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950">{getTitle(item)}</p>
                  {getDescription(item) ? <p className="mt-1 text-sm text-slate-500">{getDescription(item)}</p> : null}
                  {getMeta ? <p className="mt-2 text-xs font-medium text-slate-500">{getMeta(item)}</p> : null}
                </div>
                {selected ? (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-600 text-white">
                    <Check size={14} />
                  </span>
                ) : null}
              </div>
            </button>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => onEdit(item)}>
                <Edit2 size={14} />
                Edit
              </Button>
              <Button variant="danger" className="h-8 px-3 text-xs" onClick={() => onDelete(item)}>
                <Trash2 size={14} />
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
