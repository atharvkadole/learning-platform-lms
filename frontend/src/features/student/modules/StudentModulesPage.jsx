import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  FileQuestion,
  Layers,
  PlayCircle,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../../components/ui/Page.jsx";
import { ProgressBar } from "../../../components/ui/ProgressBar.jsx";
import { StatusBadge } from "../../../components/ui/StatusBadge.jsx";
import { api } from "../../../lib/api.js";
import { canOpenMaterial, getMaterialActionLabel, getMaterialIcon, getMaterialTypeLabel } from "../../../lib/materials.js";
import { queryKeys } from "../../../lib/queryKeys.js";
import { cn, formatPercent } from "../../../lib/utils.js";

const materialStatusOptions = [
  { value: "NOT_STARTED", label: "Not Started", icon: Circle },
  { value: "IN_PROGRESS", label: "In Progress", icon: Clock3 },
  { value: "MASTERED", label: "Mastered", icon: CheckCircle2 },
];

function getMaterialStatus(material) {
  return material.statuses?.[0]?.status || "NOT_STARTED";
}

function calculateFallbackProgress(courseModule) {
  const materials = courseModule.learningMaterials || [];
  const masteredCount = materials.filter((material) => getMaterialStatus(material) === "MASTERED").length;
  const assessmentPassed = Boolean(courseModule.assessment?.attempts?.some((attempt) => attempt.passing));

  if (!materials.length) return assessmentPassed ? 100 : 0;
  return Math.round(((masteredCount / materials.length) * 50 + (assessmentPassed ? 50 : 0)) * 100) / 100;
}

function getModuleProgress(courseModule) {
  const saved = courseModule.progress?.[0];
  const completionPercent = saved?.completionPercent ?? calculateFallbackProgress(courseModule);
  const status = saved?.status || (completionPercent >= 100 ? "MASTERED" : completionPercent > 0 ? "IN_PROGRESS" : "NOT_STARTED");
  return {
    completionPercent,
    status,
    assessmentPassed: saved?.assessmentPassed || Boolean(courseModule.assessment?.attempts?.some((attempt) => attempt.passing)),
  };
}

function getSubjectModules(subject) {
  return subject.phases.flatMap((phase) => phase.modules || []);
}

function getAverageProgress(modules) {
  if (!modules.length) return 0;
  return modules.reduce((sum, courseModule) => sum + getModuleProgress(courseModule).completionPercent, 0) / modules.length;
}

function getProgressStatus(percent) {
  if (percent >= 100) return "MASTERED";
  if (percent > 0) return "IN_PROGRESS";
  return "NOT_STARTED";
}

function getAssessmentSummary(assessment) {
  if (!assessment) return null;
  const latestAttempt = assessment.attempts?.[0] || null;
  const attemptsUsed = assessment.attempts?.length || 0;
  const attemptsLeft = Math.max(0, (assessment.attemptsAllowed || 1) - attemptsUsed);
  return {
    latestAttempt,
    attemptsUsed,
    attemptsLeft,
    questionCount: assessment._count?.questions || 0,
    status: latestAttempt?.status || "NOT_STARTED",
  };
}

export function StudentModulesPage() {
  const queryClient = useQueryClient();
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");

  const dashboard = useQuery({
    queryKey: queryKeys.studentDashboard,
    queryFn: async () => (await api.get("/student/dashboard")).data.data,
  });

  const updateStatus = useMutation({
    mutationFn: ({ materialId, status }) => api.patch("/student/progress/learning-status", { materialId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not update status"),
  });

  const subjects = useMemo(() => (dashboard.data?.subjects || []).map((item) => item.subject), [dashboard.data]);
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) || null,
    [selectedSubjectId, subjects],
  );
  const selectedPhase = useMemo(
    () => selectedSubject?.phases?.find((phase) => phase.id === selectedPhaseId) || null,
    [selectedPhaseId, selectedSubject],
  );

  useEffect(() => {
    if (selectedSubjectId && !subjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId("");
      setSelectedPhaseId("");
    }
  }, [selectedSubjectId, subjects]);

  useEffect(() => {
    if (selectedPhaseId && !selectedSubject?.phases?.some((phase) => phase.id === selectedPhaseId)) {
      setSelectedPhaseId("");
    }
  }, [selectedPhaseId, selectedSubject]);

  async function markModule(courseModule, status) {
    const materials = courseModule.learningMaterials || [];
    if (!materials.length) {
      toast.error("This module has no materials to mark yet");
      return;
    }

    await Promise.all(
      materials.map((material) => updateStatus.mutateAsync({ materialId: material.id, status })),
    );
    toast.success(status === "MASTERED" ? "Module marked mastered" : "Module marked in progress");
  }

  function updateMaterial(materialId, status) {
    updateStatus.mutate({ materialId, status }, { onSuccess: () => toast.success("Learning status updated") });
  }

  if (dashboard.isLoading) {
    return <LoadingState title="Loading learning path" description="Preparing your assigned subjects." />;
  }

  if (dashboard.isError) {
    return (
      <ErrorState
        title="Could not load learning path"
        description={dashboard.error?.response?.data?.message || "Refresh and try again."}
        onRetry={() => dashboard.refetch()}
      />
    );
  }

  if (!selectedSubject) {
    return (
      <div className="space-y-6">
        <PageHeader title="Subjects" description="Choose the subject you want to learn. Each card shows your current completion." />
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} onSelect={() => setSelectedSubjectId(subject.id)} />
          ))}
        </div>
        {!subjects.length ? (
          <Card>
            <EmptyState title="No assigned subjects yet" description="An admin needs to assign one or more subjects to your student profile." />
          </Card>
        ) : null}
      </div>
    );
  }

  if (!selectedPhase) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={selectedSubject.name}
          description="Choose a phase. Each phase is treated like a separate learning step."
          action={
            <Button variant="secondary" onClick={() => setSelectedSubjectId("")}>
              <ArrowLeft size={16} />
              Subjects
            </Button>
          }
        />
        <SubjectOverview subject={selectedSubject} />
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {selectedSubject.phases.map((phase) => (
            <PhaseCard key={phase.id} phase={phase} onSelect={() => setSelectedPhaseId(phase.id)} />
          ))}
        </div>
        {!selectedSubject.phases.length ? (
          <Card>
            <EmptyState title="No phases yet" description="Your instructor is still building this subject." />
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={selectedPhase.title}
        description="Work through only this phase's modules, then move to the next phase when ready."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSelectedPhaseId("")}>
              <ArrowLeft size={16} />
              Phases
            </Button>
            <Button variant="secondary" onClick={() => setSelectedSubjectId("")}>
              Subjects
            </Button>
          </div>
        }
      />
      <PhaseOverview subject={selectedSubject} phase={selectedPhase} />
      <div className="grid gap-4">
        {selectedPhase.modules.map((courseModule) => (
          <ModulePanel
            key={courseModule.id}
            courseModule={courseModule}
            saving={updateStatus.isPending}
            onModuleStatus={(status) => markModule(courseModule, status)}
            onMaterialStatus={updateMaterial}
          />
        ))}
        {!selectedPhase.modules.length ? (
          <Card>
            <EmptyState title="No modules yet" description="Your instructor is still building this phase." />
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function SubjectCard({ subject, onSelect }) {
  const modules = getSubjectModules(subject);
  const percent = getAverageProgress(modules);
  const status = getProgressStatus(percent);

  return (
    <button type="button" className="lms-panel focus-ring rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg" onClick={onSelect}>
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <BookOpen size={21} />
        </span>
        <StatusBadge value={status} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{subject.name}</h2>
      {subject.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{subject.description}</p> : null}
      <ProgressBar value={percent} label="Subject progress" className="mt-5" />
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <InfoStat label="Phases" value={subject.phases.length} />
        <InfoStat label="Modules" value={modules.length} />
      </div>
    </button>
  );
}

function SubjectOverview({ subject }) {
  const modules = getSubjectModules(subject);
  const percent = getAverageProgress(modules);

  return (
    <Card className="lms-panel">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Selected Subject</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{subject.name}</h2>
          {subject.description ? <p className="mt-1 text-sm text-slate-500">{subject.description}</p> : null}
        </div>
        <ProgressBar value={percent} label="Subject progress" />
      </div>
    </Card>
  );
}

function PhaseCard({ phase, onSelect }) {
  const percent = getAverageProgress(phase.modules || []);
  const status = getProgressStatus(percent);

  return (
    <button type="button" className="lms-panel focus-ring rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg" onClick={onSelect}>
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <Layers size={21} />
        </span>
        <StatusBadge value={status} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{phase.title}</h2>
      {phase.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{phase.description}</p> : null}
      <ProgressBar value={percent} label="Phase progress" className="mt-5" />
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <InfoStat label="Modules" value={phase.modules?.length || 0} />
        <InfoStat label="Status" value={status.replaceAll("_", " ")} />
      </div>
    </button>
  );
}

function PhaseOverview({ subject, phase }) {
  const percent = getAverageProgress(phase.modules || []);

  return (
    <Card className="lms-panel">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{subject.name}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{phase.title}</h2>
          {phase.description ? <p className="mt-1 text-sm text-slate-500">{phase.description}</p> : null}
        </div>
        <ProgressBar value={percent} label="Phase progress" />
      </div>
    </Card>
  );
}

function ModulePanel({ courseModule, saving, onModuleStatus, onMaterialStatus }) {
  const progress = getModuleProgress(courseModule);
  const assessment = getAssessmentSummary(courseModule.assessment);

  return (
    <article className="lms-panel rounded-2xl border p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-slate-950">{courseModule.title}</h3>
            <StatusBadge value={progress.status} />
          </div>
          {courseModule.description ? <p className="mt-1 text-sm text-slate-500">{courseModule.description}</p> : null}
          <ProgressBar value={progress.completionPercent} label="Module progress" className="mt-4" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="h-9 px-3"
              disabled={saving || !courseModule.learningMaterials?.length}
              onClick={() => onModuleStatus("IN_PROGRESS")}
            >
              <Clock3 size={15} />
              Mark In Progress
            </Button>
            <Button
              className="h-9 px-3"
              disabled={saving || !courseModule.learningMaterials?.length}
              onClick={() => onModuleStatus("MASTERED")}
            >
              <CheckCircle2 size={15} />
              Mark Mastered
            </Button>
          </div>
        </div>

        <AssessmentMiniCard assessment={courseModule.assessment} summary={assessment} />
      </div>

      <div className="mt-4 space-y-2">
        {(courseModule.learningMaterials || []).map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            saving={saving}
            onStatus={(status) => onMaterialStatus(material.id, status)}
          />
        ))}
        {!courseModule.learningMaterials?.length ? (
          <EmptyState title="No materials yet" description="Your instructor has not added resources for this module." />
        ) : null}
      </div>
    </article>
  );
}

function AssessmentMiniCard({ assessment, summary }) {
  if (!assessment) {
    return (
      <div className="lms-soft rounded-2xl border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <FileQuestion size={16} className="text-slate-500" />
          No Assessment
        </div>
        <p className="mt-2 text-sm text-slate-500">This module does not have an assessment yet.</p>
      </div>
    );
  }

  return (
    <div className="lms-soft rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{assessment.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.questionCount} questions / {summary.attemptsUsed} of {assessment.attemptsAllowed} attempts
          </p>
        </div>
        <StatusBadge value={summary.status} />
      </div>
      {summary.latestAttempt?.status === "GRADED" ? (
        <p className="mt-3 text-sm font-medium text-slate-700">
          Score {formatPercent(summary.latestAttempt.score)} / {summary.latestAttempt.passing ? "Passed" : "Needs retry"}
        </p>
      ) : null}
      <Link
        to="/student/assessments"
        className="focus-ring mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
      >
        <PlayCircle size={16} />
        Take Assessment
      </Link>
    </div>
  );
}

function MaterialCard({ material, saving, onStatus }) {
  const Icon = getMaterialIcon(material.type);
  const openable = canOpenMaterial(material);
  const currentStatus = getMaterialStatus(material);

  return (
    <div className="lms-soft rounded-2xl border p-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium text-slate-950">{material.title}</p>
              <StatusBadge value={currentStatus} />
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {getMaterialTypeLabel(material.type)}
              {material.estimatedMinutes ? ` / ${material.estimatedMinutes} min` : ""}
            </p>
            {material.description ? <p className="mt-1 text-sm text-slate-500">{material.description}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {openable ? (
            <a
              className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              href={material.contentUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                if (currentStatus === "NOT_STARTED") onStatus("IN_PROGRESS");
              }}
            >
              <ExternalLink size={14} />
              {getMaterialActionLabel(material.type)}
            </a>
          ) : null}
          <MaterialStatusControl value={currentStatus} saving={saving} onChange={onStatus} />
        </div>
      </div>
      {!openable ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          This material does not have a link yet. You can still mark your learning status.
        </p>
      ) : null}
    </div>
  );
}

function MaterialStatusControl({ value, saving, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {materialStatusOptions.map((option) => {
        const Icon = option.icon;
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={saving || selected}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition disabled:cursor-not-allowed",
              selected ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-100",
            )}
            onClick={() => onChange(option.value)}
          >
            <Icon size={13} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function InfoStat({ label, value }) {
  return (
    <div className="lms-soft rounded-xl border px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-950">{value}</p>
    </div>
  );
}
