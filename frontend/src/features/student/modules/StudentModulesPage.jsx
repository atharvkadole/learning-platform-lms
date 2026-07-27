import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  ExternalLink,
  FileQuestion,
  Layers,
  PlayCircle,
  X,
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

function compactText(value, limit = 220) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trim()}...`;
}

export function StudentModulesPage() {
  const queryClient = useQueryClient();
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");

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
      setSelectedModuleId("");
    }
  }, [selectedSubjectId, subjects]);

  useEffect(() => {
    if (selectedPhaseId && !selectedSubject?.phases?.some((phase) => phase.id === selectedPhaseId)) {
      setSelectedPhaseId("");
      setSelectedModuleId("");
    }
  }, [selectedPhaseId, selectedSubject]);

  useEffect(() => {
    if (!selectedPhase) {
      if (selectedModuleId) setSelectedModuleId("");
      return;
    }

    const modules = selectedPhase.modules || [];
    const selectedStillExists = selectedModuleId && modules.some((courseModule) => courseModule.id === selectedModuleId);
    if (!selectedStillExists) setSelectedModuleId(modules[0]?.id || "");
  }, [selectedModuleId, selectedPhase]);

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
        <PageHeader
          title="Subjects"
          description="Choose the subject you want to learn. Each card shows your current completion."
          action={
            <Link
              to="/student/dashboard"
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Exit Learning
            </Link>
          }
        />
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
            <div className="flex flex-wrap gap-2">
              <Link
                to="/student/dashboard"
                className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                Exit
              </Link>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedSubjectId("");
                  setSelectedPhaseId("");
                  setSelectedModuleId("");
                }}
              >
                <ArrowLeft size={16} />
                Subjects
              </Button>
            </div>
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
            <Link
              to="/student/dashboard"
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Exit
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedPhaseId("");
                setSelectedModuleId("");
              }}
            >
              <ArrowLeft size={16} />
              Phases
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedSubjectId("");
                setSelectedPhaseId("");
                setSelectedModuleId("");
              }}
            >
              Subjects
            </Button>
          </div>
        }
      />
      <PhaseOverview subject={selectedSubject} phase={selectedPhase} />
      <ModuleLearningWorkspace
        modules={selectedPhase.modules || []}
        selectedModuleId={selectedModuleId}
        saving={updateStatus.isPending}
        onSelectModule={setSelectedModuleId}
        onModuleStatus={markModule}
        onMaterialStatus={updateMaterial}
      />
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
          {subject.description ? <p className="mt-1 text-sm text-slate-500">{compactText(subject.description, 160)}</p> : null}
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
          {subject.description ? <p className="mt-1 text-sm text-slate-500">{compactText(subject.description, 220)}</p> : null}
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
      {phase.description ? <p className="mt-1 text-sm text-slate-500">{compactText(phase.description, 180)}</p> : null}
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
          {phase.description ? <p className="mt-1 text-sm text-slate-500">{compactText(phase.description, 260)}</p> : null}
        </div>
        <ProgressBar value={percent} label="Phase progress" />
      </div>
    </Card>
  );
}

function ModuleLearningWorkspace({ modules, selectedModuleId, saving, onSelectModule, onModuleStatus, onMaterialStatus }) {
  const selectedIndex = Math.max(0, modules.findIndex((courseModule) => courseModule.id === selectedModuleId));
  const selectedModule = modules[selectedIndex] || modules[0] || null;

  if (!modules.length) {
    return (
      <Card>
        <EmptyState title="No modules yet" description="Your instructor is still building this phase." />
      </Card>
    );
  }

  function selectOffset(offset) {
    const nextIndex = selectedIndex + offset;
    const nextModule = modules[nextIndex];
    if (nextModule) onSelectModule(nextModule.id);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <Card className="p-0 xl:sticky xl:top-24 xl:self-start">
        <div className="border-b border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Phase Modules</p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">{modules.length} modules</h2>
          <p className="mt-1 text-sm text-slate-500">Select a module to study. Only the selected module opens here.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto p-3 xl:block xl:max-h-[calc(100vh-16rem)] xl:space-y-2 xl:overflow-y-auto xl:overflow-x-hidden">
          {modules.map((courseModule, index) => (
            <ModuleNavItem
              key={courseModule.id}
              courseModule={courseModule}
              index={index}
              selected={courseModule.id === selectedModule?.id}
              onSelect={() => onSelectModule(courseModule.id)}
            />
          ))}
        </div>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Module {selectedIndex + 1} of {modules.length}
              </p>
              <h2 className="mt-1 text-lg font-semibold leading-7 text-slate-950">{selectedModule.title}</h2>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="h-9 px-3" disabled={selectedIndex <= 0} onClick={() => selectOffset(-1)}>
                <ChevronLeft size={16} />
                Previous
              </Button>
              <Button variant="secondary" className="h-9 px-3" disabled={selectedIndex >= modules.length - 1} onClick={() => selectOffset(1)}>
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </Card>

        <ModulePanel
          courseModule={selectedModule}
          saving={saving}
          onModuleStatus={(status) => onModuleStatus(selectedModule, status)}
          onMaterialStatus={onMaterialStatus}
        />
      </div>
    </div>
  );
}

function ModuleNavItem({ courseModule, index, selected, onSelect }) {
  const progress = getModuleProgress(courseModule);
  const percent = Math.max(0, Math.min(100, Math.round(Number(progress.completionPercent) || 0)));

  return (
    <button
      type="button"
      className={cn(
        "min-w-[16rem] rounded-xl border p-3 text-left transition xl:min-w-0 xl:w-full",
        selected
          ? "border-blue-300 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-slate-50",
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-sm font-semibold", selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700")}>
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold text-slate-950">{courseModule.title}</span>
          <span className="mt-1 block text-xs text-slate-500">
            {courseModule.learningMaterials?.length || 0} materials / {courseModule.assessment ? "assessment" : "no assessment"}
          </span>
        </span>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>{progress.status.replaceAll("_", " ")}</span>
          <span className="font-semibold text-slate-700">{percent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <span className="block h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </button>
  );
}

function ModulePanel({ courseModule, saving, onModuleStatus, onMaterialStatus }) {
  const progress = getModuleProgress(courseModule);
  const assessment = getAssessmentSummary(courseModule.assessment);
  const materials = useMemo(() => courseModule.learningMaterials || [], [courseModule.learningMaterials]);
  const [readerMaterial, setReaderMaterial] = useState(null);

  useEffect(() => {
    if (readerMaterial && !materials.some((material) => material.id === readerMaterial.id)) {
      setReaderMaterial(null);
    }
  }, [materials, readerMaterial]);

  return (
    <>
    <article className="lms-panel rounded-2xl border p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold leading-7 text-slate-950">{courseModule.title}</h3>
            <StatusBadge value={progress.status} />
          </div>
          {courseModule.description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">{compactText(courseModule.description, 420)}</p> : null}
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

      {materials.length ? (
        <section className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-950">Materials</h4>
            <span className="text-xs font-medium text-slate-500">{materials.length} items</span>
          </div>
          <div className="grid gap-3">
            {materials.map((material, index) => (
              <MaterialCard
                key={material.id}
                index={index}
                material={material}
                saving={saving}
                onStatus={(status) => onMaterialStatus(material.id, status)}
                onRead={() => setReaderMaterial(material)}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="mt-4">
          <EmptyState title="No materials yet" description="Your instructor has not added resources for this module." />
        </div>
      )}
    </article>
    {readerMaterial ? (
      <LessonReaderModal
        material={readerMaterial}
        saving={saving}
        onClose={() => setReaderMaterial(null)}
        onStatus={(status) => onMaterialStatus(readerMaterial.id, status)}
      />
    ) : null}
    </>
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

function MaterialCard({ material, index, saving, onStatus, onRead }) {
  const Icon = getMaterialIcon(material.type);
  const openable = canOpenMaterial(material);
  const currentStatus = getMaterialStatus(material);
  const content = material.description?.trim();
  const preview = compactText(content, 260);

  return (
    <article className="lms-soft rounded-2xl border p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Icon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">{index + 1}</span>
              <StatusBadge value={currentStatus} />
            </div>
            <h5 className="mt-2 text-base font-semibold leading-6 text-slate-950">{material.title}</h5>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {getMaterialTypeLabel(material.type)}
              {material.estimatedMinutes ? ` / ${material.estimatedMinutes} min` : ""}
            </p>
            {preview ? <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-500">{preview}</p> : null}
            {!openable ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                This material does not have a link yet. You can still mark your learning status.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:max-w-xs xl:justify-end">
          {content ? (
            <Button className="h-9 px-3 text-xs" onClick={onRead}>
              <BookOpen size={14} />
              Read Lesson
            </Button>
          ) : null}
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
    </article>
  );
}

function LessonReaderModal({ material, saving, onClose, onStatus }) {
  const Icon = getMaterialIcon(material.type);
  const openable = canOpenMaterial(material);
  const currentStatus = getMaterialStatus(material);
  const content = material.description?.trim();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
      <section className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950">{material.title}</h2>
                <StatusBadge value={currentStatus} />
              </div>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                {getMaterialTypeLabel(material.type)}
                {material.estimatedMinutes ? ` / ${material.estimatedMinutes} min` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
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
            <Button variant="secondary" className="h-9 px-3 text-xs" onClick={onClose}>
              <X size={14} />
              Close
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {content ? (
            <div className="mx-auto max-w-3xl whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
              {content}
            </div>
          ) : (
            <EmptyState title="No lesson text" description="Use the material link or ask the instructor to add lesson content." />
          )}
        </div>
      </section>
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
