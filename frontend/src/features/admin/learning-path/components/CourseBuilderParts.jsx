import { BookOpen, ChevronDown, ClipboardList, Edit2, FileText, Layers, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/Button.jsx";
import { Select } from "../../../../components/ui/Field.jsx";
import { StatusBadge } from "../../../../components/ui/StatusBadge.jsx";
import { cn } from "../../../../lib/utils.js";

export function CoursePicker({ courses, selectedCourseId, onSelect, onCreate }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select className="sm:w-72" value={selectedCourseId} onChange={(event) => onSelect(event.target.value)}>
        {courses.length ? (
          courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))
        ) : (
          <option value="">No courses yet</option>
        )}
      </Select>
      <Button onClick={onCreate}>
        <Plus size={16} />
        New Course
      </Button>
    </div>
  );
}

export function BuilderEmptyState({ title, description, action }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="font-medium text-slate-950">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PhaseBlock({ phase, open, children, onToggle, onAddModule, onEdit, onDelete }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className={cn("grid gap-3 p-4 lg:grid-cols-[minmax(16rem,1fr)_auto] lg:items-start", open && "bg-slate-50")}>
        <button type="button" className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 text-left" onClick={onToggle}>
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Layers size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold text-slate-950">{phase.title}</span>
            {phase.description ? <span className="mt-1 block line-clamp-2 text-sm text-slate-500">{phase.description}</span> : null}
            <span className="mt-2 block text-xs font-medium text-slate-500">{phase.modules?.length || 0} modules</span>
          </span>
          <ChevronDown className={cn("mt-2 shrink-0 text-slate-400 transition", open && "rotate-180")} size={18} />
        </button>
        <div className="flex flex-wrap gap-2 lg:max-w-[25rem] lg:justify-end">
          <Button variant="secondary" className="h-9 px-3 text-sm" onClick={onAddModule}>
            <Plus size={15} />
            Module
          </Button>
          <Button variant="secondary" className="h-9 px-3 text-sm" onClick={onEdit}>
            <Edit2 size={15} />
            Edit
          </Button>
          <Button variant="danger" className="h-9 px-3 text-sm" onClick={onDelete}>
            <Trash2 size={15} />
            Delete
          </Button>
        </div>
      </div>
      {open ? <div className="border-t border-slate-200 bg-white p-4">{children}</div> : null}
    </section>
  );
}

export function ModuleRow({ courseModule, open, children, onToggle, onAddMaterial, onEdit, onDelete }) {
  return (
    <div className={cn("rounded-2xl border transition", open ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-white")}>
      <div className="grid gap-3 p-4 lg:grid-cols-[minmax(16rem,1fr)_auto] lg:items-start">
        <button type="button" className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 text-left" onClick={onToggle}>
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
            <BookOpen size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-950">{courseModule.title}</span>
            {courseModule.description ? <span className="mt-1 block line-clamp-2 text-sm text-slate-500">{courseModule.description}</span> : null}
            <span className="mt-2 block truncate text-xs font-medium text-slate-500">
              {courseModule.learningMaterials?.length || 0} materials / {courseModule.assessment ? "assessment attached" : "no assessment"}
            </span>
          </span>
          <ChevronDown className={cn("mt-2 shrink-0 text-slate-400 transition", open && "rotate-180")} size={18} />
        </button>
        <div className="flex flex-wrap gap-2 lg:max-w-[25rem] lg:justify-end">
          <Button variant="secondary" className="h-9 px-3 text-sm" onClick={onAddMaterial}>
            <Plus size={15} />
            Material
          </Button>
          <Button variant="secondary" className="h-9 px-3 text-sm" onClick={onEdit}>
            <Edit2 size={15} />
            Edit
          </Button>
          <Button variant="danger" className="h-9 px-3 text-sm" onClick={onDelete}>
            <Trash2 size={15} />
            Delete
          </Button>
        </div>
      </div>
      {open ? <div className="border-t border-slate-200 bg-white p-4">{children}</div> : null}
    </div>
  );
}

export function MaterialRow({ material, onEdit, onDelete }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-700">
          <FileText size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-950">{material.title}</p>
          <p className="text-sm text-slate-500">
            {material.type.replaceAll("_", " ")}
            {material.estimatedMinutes ? ` / ${material.estimatedMinutes} min` : ""}
          </p>
        </div>
      </div>
      <div className="flex gap-2 sm:justify-end">
        <Button variant="secondary" className="h-8 px-3 text-xs" onClick={onEdit}>
          <Edit2 size={14} />
          Edit
        </Button>
        <Button variant="danger" className="h-8 px-3 text-xs" onClick={onDelete}>
          <Trash2 size={14} />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function AssessmentSummary({ assessment, onDelete }) {
  if (!assessment) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        No assessment is attached to this module.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700">
            <ClipboardList size={17} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-950">{assessment.title}</p>
              <StatusBadge value={assessment.isPublished ? "ACTIVE" : "INACTIVE"} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Passing {Math.round(assessment.passingPercent)}% / {assessment.attemptsAllowed} attempts
            </p>
          </div>
        </div>
        <Button variant="danger" className="h-8 px-3 text-xs" onClick={onDelete}>
          <Trash2 size={14} />
          Delete
        </Button>
      </div>
    </div>
  );
}
