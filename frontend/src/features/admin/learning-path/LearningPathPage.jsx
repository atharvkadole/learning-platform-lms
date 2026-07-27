import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, ClipboardList, Edit2, FileText, Layers, Plus, Settings, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Card.jsx";
import { StatusBadge } from "../../../components/ui/StatusBadge.jsx";
import { api } from "../../../lib/api.js";
import {
  AssessmentSummary,
  BuilderEmptyState,
  CoursePicker,
  MaterialRow,
} from "./components/CourseBuilderParts.jsx";
import {
  AssessmentForm,
  CourseForm,
  MaterialForm,
  ModuleForm,
  PhaseForm,
} from "./components/CurriculumForms.jsx";
import {
  normalizeQuestionForForm,
  normalizeQuestionsForPayload,
} from "./components/assessmentQuestionUtils.js";
import { InlineFormPanel } from "./components/InlineFormPanel.jsx";

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const optionSchema = z.object({
  text: z.string().optional(),
  isCorrect: z.boolean().default(false),
});

const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["MCQ", "MULTIPLE_ANSWER", "TRUE_FALSE", "FILL_IN_BLANK"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  points: z.coerce.number().positive(),
  correctTextAnswer: z.string().optional(),
  displayOrder: z.coerce.number().int(),
  options: z.array(optionSchema).default([]),
});

const courseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.coerce.number().int(),
  isActive: z.boolean().default(true),
});

const phaseSchema = z.object({
  title: z.string().min(1, "Phase title is required"),
  description: z.string().optional(),
  displayOrder: z.coerce.number().int(),
});

const moduleSchema = z.object({
  title: z.string().min(1, "Module title is required"),
  description: z.string().optional(),
  displayOrder: z.coerce.number().int(),
});

const materialSchema = z.object({
  title: z.string().min(1, "Material title is required"),
  description: z.string().optional(),
  type: z.enum([
    "VIDEO",
    "VIDEO_FILE",
    "PDF",
    "MARKDOWN",
    "SLIDES",
    "EXTERNAL_LINK",
    "ARTICLE",
    "CODE_SNIPPET",
    "GITHUB_REPOSITORY",
    "YOUTUBE_VIDEO",
    "GOOGLE_DRIVE",
    "DROPBOX",
    "ONEDRIVE",
    "ZIP",
    "IMAGE",
    "INTERNAL_UPLOAD",
    "ATTACHMENT",
  ]),
  contentUrl: z.string().optional(),
  estimatedMinutes: optionalNumber,
  displayOrder: z.coerce.number().int(),
});

const assessmentSchema = z.object({
  title: z.string().min(1, "Assessment title is required"),
  description: z.string().optional(),
  durationMinutes: optionalNumber,
  passingPercent: z.coerce.number().min(0).max(100),
  attemptsAllowed: z.coerce.number().int().positive(),
  isPublished: z.boolean().default(true),
  questions: z.array(questionSchema).default([]),
});

const courseDefaults = { name: "", description: "", icon: "", order: 0, isActive: true };
const phaseDefaults = { title: "", description: "", displayOrder: 1 };
const moduleDefaults = { title: "", description: "", displayOrder: 1 };
const materialDefaults = {
  title: "",
  description: "",
  type: "ARTICLE",
  contentUrl: "",
  estimatedMinutes: "",
  displayOrder: 1,
};
const assessmentDefaults = {
  title: "",
  description: "",
  durationMinutes: "",
  passingPercent: 60,
  attemptsAllowed: 1,
  isPublished: true,
  questions: [],
};

function cleanOptionalNumbers(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === "" ? undefined : value]));
}

function cleanAssessmentPayload(values) {
  return {
    ...cleanOptionalNumbers(values),
    description: values.description?.trim() || undefined,
    questions: normalizeQuestionsForPayload(values.questions),
  };
}

export function LearningPathPage() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [formMode, setFormMode] = useState({ type: null, item: null });

  const courses = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await api.get("/admin/subjects?limit=100")).data.data,
  });

  const tree = useQuery({
    queryKey: ["subject-tree", selectedCourseId],
    enabled: Boolean(selectedCourseId),
    queryFn: async () => (await api.get(`/admin/learning-path/subjects/${selectedCourseId}/tree`)).data.data,
  });

  const courseForm = useForm({ resolver: zodResolver(courseSchema), defaultValues: courseDefaults });
  const phaseForm = useForm({ resolver: zodResolver(phaseSchema), defaultValues: phaseDefaults });
  const moduleForm = useForm({ resolver: zodResolver(moduleSchema), defaultValues: moduleDefaults });
  const materialForm = useForm({ resolver: zodResolver(materialSchema), defaultValues: materialDefaults });
  const assessmentForm = useForm({ resolver: zodResolver(assessmentSchema), defaultValues: assessmentDefaults });

  const selectedCourse = tree.data;
  const selectedCoursePreview = selectedCourse || (courses.data || []).find((course) => course.id === selectedCourseId) || null;
  const loadingCourseTree = Boolean(selectedCourseId) && tree.isLoading;
  const phases = useMemo(() => selectedCourse?.phases || [], [selectedCourse]);
  const selectedPhase = useMemo(
    () => phases.find((phase) => phase.id === selectedPhaseId) || null,
    [phases, selectedPhaseId],
  );
  const selectedModule = useMemo(
    () => selectedPhase?.modules?.find((courseModule) => courseModule.id === selectedModuleId) || null,
    [selectedPhase, selectedModuleId],
  );
  const selectedAssessment = selectedModule?.assessment || null;

  useEffect(() => {
    if (!selectedCourseId && courses.data?.length) {
      setSelectedCourseId(courses.data[0].id);
    }
  }, [courses.data, selectedCourseId]);

  useEffect(() => {
    if (!selectedCourse) return;
    const stillHasPhase = selectedPhaseId && selectedCourse.phases.some((phase) => phase.id === selectedPhaseId);
    if (!stillHasPhase) {
      setSelectedPhaseId(selectedCourse.phases[0]?.id || "");
      setSelectedModuleId("");
    }
  }, [selectedCourse, selectedPhaseId]);

  useEffect(() => {
    if (!selectedPhase) {
      if (selectedModuleId) setSelectedModuleId("");
      return;
    }
    const stillHasModule = selectedModuleId && selectedPhase.modules.some((courseModule) => courseModule.id === selectedModuleId);
    if (!stillHasModule) setSelectedModuleId(selectedPhase.modules[0]?.id || "");
  }, [selectedModuleId, selectedPhase]);

  useEffect(() => {
    if (selectedAssessment) {
      assessmentForm.reset({
        title: selectedAssessment.title || "",
        description: selectedAssessment.description || "",
        durationMinutes: selectedAssessment.durationMinutes ?? "",
        passingPercent: selectedAssessment.passingPercent ?? 60,
        attemptsAllowed: selectedAssessment.attemptsAllowed ?? 1,
        isPublished: selectedAssessment.isPublished ?? true,
        questions: (selectedAssessment.questions || []).map(normalizeQuestionForForm),
      });
      return;
    }

    assessmentForm.reset({
      ...assessmentDefaults,
      title: selectedModule ? `${selectedModule.title} Assessment` : "",
    });
  }, [assessmentForm, selectedAssessment, selectedModule]);

  function closeForm() {
    setFormMode({ type: null, item: null });
  }

  function invalidateCourse(courseId = selectedCourseId) {
    queryClient.invalidateQueries({ queryKey: ["subjects"] });
    if (courseId) queryClient.invalidateQueries({ queryKey: ["subject-tree", courseId] });
  }

  function selectCourse(courseId) {
    setSelectedCourseId(courseId);
    setSelectedPhaseId("");
    setSelectedModuleId("");
    closeForm();
  }

  function findModuleContext(moduleId) {
    for (const phase of phases) {
      const courseModule = phase.modules?.find((module) => module.id === moduleId);
      if (courseModule) return { phase, courseModule };
    }
    return { phase: null, courseModule: null };
  }

  function startCreate(type, context = {}) {
    setFormMode({ type, item: null, ...context });

    if (type === "course") {
      courseForm.reset(courseDefaults);
    }

    if (type === "phase") {
      phaseForm.reset({ ...phaseDefaults, displayOrder: phases.length + 1 });
    }

    if (type === "module") {
      const phase = phases.find((item) => item.id === context.phaseId) || selectedPhase;
      if (phase) setSelectedPhaseId(phase.id);
      moduleForm.reset({ ...moduleDefaults, displayOrder: (phase?.modules?.length || 0) + 1 });
    }

    if (type === "material") {
      const moduleId = context.moduleId || selectedModuleId;
      const { phase, courseModule } = findModuleContext(moduleId);
      if (phase) setSelectedPhaseId(phase.id);
      if (courseModule) setSelectedModuleId(courseModule.id);
      materialForm.reset({
        ...materialDefaults,
        displayOrder: (courseModule?.learningMaterials?.length || 0) + 1,
      });
    }
  }

  function startEdit(type, item, context = {}) {
    setFormMode({ type, item, ...context });

    if (type === "course") {
      courseForm.reset({
        name: item.name || "",
        description: item.description || "",
        icon: item.icon || "",
        order: item.order || 0,
        isActive: item.isActive ?? true,
      });
    }

    if (type === "phase") {
      setSelectedPhaseId(item.id);
      phaseForm.reset({
        title: item.title || "",
        description: item.description || "",
        displayOrder: item.displayOrder || 1,
      });
    }

    if (type === "module") {
      setSelectedPhaseId(context.phaseId);
      setSelectedModuleId(item.id);
      moduleForm.reset({
        title: item.title || "",
        description: item.description || "",
        displayOrder: item.displayOrder || 1,
      });
    }

    if (type === "material") {
      const { phase } = findModuleContext(context.moduleId);
      if (phase) setSelectedPhaseId(phase.id);
      setSelectedModuleId(context.moduleId);
      materialForm.reset({
        title: item.title || "",
        description: item.description || "",
        type: item.type || "ARTICLE",
        contentUrl: item.contentUrl || "",
        estimatedMinutes: item.estimatedMinutes || "",
        displayOrder: item.displayOrder || 1,
      });
    }
  }

  const saveCourse = useMutation({
    mutationFn: (values) =>
      formMode.type === "course" && formMode.item
        ? api.patch(`/admin/subjects/${formMode.item.id}`, values)
        : api.post("/admin/subjects", values),
    onSuccess: (response) => {
      const course = response.data.data;
      toast.success(formMode.item ? "Course updated" : "Course created");
      setSelectedCourseId(course.id);
      setSelectedPhaseId("");
      setSelectedModuleId("");
      courseForm.reset(courseDefaults);
      setFormMode({ type: "phase", item: null });
      invalidateCourse(course.id);
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save course"),
  });

  const savePhase = useMutation({
    mutationFn: (values) =>
      formMode.type === "phase" && formMode.item
        ? api.patch(`/admin/learning-path/phases/${formMode.item.id}`, values)
        : api.post(`/admin/learning-path/subjects/${selectedCourseId}/phases`, values),
    onSuccess: (response) => {
      const phase = response.data.data;
      toast.success(formMode.item ? "Phase updated" : "Phase created");
      setSelectedPhaseId(phase.id);
      phaseForm.reset({ ...phaseDefaults, displayOrder: phases.length + 2 });
      setFormMode({ type: "module", item: null, phaseId: phase.id });
      invalidateCourse();
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save phase"),
  });

  const saveModule = useMutation({
    mutationFn: (values) => {
      const phaseId = formMode.phaseId || selectedPhaseId;
      return formMode.type === "module" && formMode.item
        ? api.patch(`/admin/learning-path/modules/${formMode.item.id}`, values)
        : api.post(`/admin/learning-path/phases/${phaseId}/modules`, values);
    },
    onSuccess: (response) => {
      const courseModule = response.data.data;
      const phaseId = formMode.phaseId || selectedPhaseId;
      toast.success(formMode.item ? "Module updated" : "Module created");
      setSelectedPhaseId(phaseId);
      setSelectedModuleId(courseModule.id);
      moduleForm.reset(moduleDefaults);
      setFormMode({ type: "material", item: null, phaseId, moduleId: courseModule.id });
      invalidateCourse();
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save module"),
  });

  const saveMaterial = useMutation({
    mutationFn: (values) => {
      const payload = cleanOptionalNumbers(values);
      return formMode.type === "material" && formMode.item
        ? api.patch(`/admin/materials/${formMode.item.id}`, payload)
        : api.post("/admin/materials", { ...payload, moduleId: formMode.moduleId || selectedModuleId });
    },
    onSuccess: () => {
      toast.success(formMode.item ? "Material updated" : "Material created");
      if (formMode.item) {
        closeForm();
      } else {
        materialForm.reset({
          ...materialDefaults,
          displayOrder: (selectedModule?.learningMaterials?.length || 0) + 2,
        });
      }
      invalidateCourse();
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save material"),
  });

  const saveAssessment = useMutation({
    mutationFn: (values) => {
      const payload = cleanAssessmentPayload(values);
      if (selectedModule?.assessment) {
        return api.patch(`/admin/assessments/${selectedModule.assessment.id}`, payload);
      }
      return api.post("/admin/assessments", {
        ...payload,
        moduleId: selectedModuleId,
      });
    },
    onSuccess: () => {
      toast.success(selectedModule?.assessment ? "Assessment updated" : "Assessment attached");
      invalidateCourse();
      queryClient.invalidateQueries({ queryKey: ["admin-assessments"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save assessment"),
  });

  const removeItem = useMutation({
    mutationFn: ({ kind, id }) => {
      if (kind === "course") return api.delete(`/admin/subjects/${id}`);
      if (kind === "phase") return api.delete(`/admin/learning-path/phases/${id}`);
      if (kind === "module") return api.delete(`/admin/learning-path/modules/${id}`);
      if (kind === "assessment") return api.delete(`/admin/assessments/${id}`);
      return api.delete(`/admin/materials/${id}`);
    },
    onSuccess: (_response, variables) => {
      toast.success("Deleted");
      if (variables.kind === "course") {
        setSelectedCourseId("");
        setSelectedPhaseId("");
        setSelectedModuleId("");
      }
      if (variables.kind === "phase") {
        setSelectedPhaseId("");
        setSelectedModuleId("");
      }
      if (variables.kind === "module") setSelectedModuleId("");
      closeForm();
      invalidateCourse();
      queryClient.invalidateQueries({ queryKey: ["admin-assessments"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not delete item"),
  });

  function confirmDelete(kind, id, label) {
    if (window.confirm(`Delete ${label}? Child content will also be removed where applicable.`)) {
      removeItem.mutate({ kind, id });
    }
  }

  const showCourseForm = formMode.type === "course";
  const courseStats = {
    phases: phases.length,
    modules: phases.reduce((sum, phase) => sum + (phase.modules?.length || 0), 0),
    materials: phases.reduce(
      (sum, phase) =>
        sum + (phase.modules || []).reduce((moduleSum, courseModule) => moduleSum + (courseModule.learningMaterials?.length || 0), 0),
      0,
    ),
  };

  function selectPhaseFromNavigator(phase) {
    setSelectedPhaseId(phase.id);
    setSelectedModuleId(phase.modules?.[0]?.id || "");
    closeForm();
  }

  function selectModuleFromNavigator(phase, courseModule) {
    setSelectedPhaseId(phase.id);
    setSelectedModuleId(courseModule.id);
    closeForm();
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Course Builder</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              {selectedCoursePreview?.name || "Build a course like an LMS"}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Create the course, add phases, place modules inside each phase, then attach materials and assessments inside the module.
            </p>
          </div>
          <CoursePicker
            courses={courses.data || []}
            selectedCourseId={selectedCourseId}
            onSelect={selectCourse}
            onCreate={() => startCreate("course")}
          />
        </div>
      </Card>

      {showCourseForm ? (
        <Card>
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-950">{formMode.item ? "Edit Course" : "Create Course"}</h2>
            <p className="mt-1 text-sm text-slate-500">Set the top-level subject details before building phases and modules.</p>
          </div>
          <CourseForm
            form={courseForm}
            onSubmit={(values) => saveCourse.mutate(values)}
            saving={saveCourse.isPending}
            submitLabel={formMode.item ? "Update Course" : "Create Course"}
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <CurriculumNavigator
            loading={loadingCourseTree}
            selectedCourse={selectedCourse}
            phases={phases}
            selectedPhaseId={selectedPhaseId}
            selectedModuleId={selectedModuleId}
            onCreateCourse={() => startCreate("course")}
            onAddPhase={() => startCreate("phase")}
            onAddModule={(phase) => startCreate("module", { phaseId: phase.id })}
            onSelectPhase={selectPhaseFromNavigator}
            onSelectModule={selectModuleFromNavigator}
          />

          <div className="min-w-0 space-y-6">
            {loadingCourseTree ? (
              <Card>
                <BuilderEmptyState title="Loading course" description="Loading the selected course structure." />
              </Card>
            ) : !selectedCourse ? (
              <Card>
                <BuilderEmptyState
                  title="Create or select a course"
                  description="A course is the top-level subject container. After that, the curriculum builder appears here."
                  action={
                    <Button onClick={() => startCreate("course")}>
                      <Plus size={16} />
                      Create Course
                    </Button>
                  }
                />
              </Card>
            ) : (
              <>
                <CourseSettingsPanel
                  course={selectedCourse}
                  stats={courseStats}
                  onEdit={() => startEdit("course", selectedCourse)}
                  onDelete={() => confirmDelete("course", selectedCourse.id, selectedCourse.name)}
                />

                <PhaseWorkspace
                  selectedPhase={selectedPhase}
                  selectedModule={selectedModule}
                  formMode={formMode}
                  phaseForm={phaseForm}
                  moduleForm={moduleForm}
                  materialForm={materialForm}
                  assessmentForm={assessmentForm}
                  saving={{
                    phase: savePhase.isPending,
                    module: saveModule.isPending,
                    material: saveMaterial.isPending,
                    assessment: saveAssessment.isPending,
                  }}
                  onCloseForm={closeForm}
                  onAddPhase={() => startCreate("phase")}
                  onEditPhase={(phase) => startEdit("phase", phase)}
                  onDeletePhase={(phase) => confirmDelete("phase", phase.id, phase.title)}
                  onAddModule={(phase) => startCreate("module", { phaseId: phase.id })}
                  onEditModule={(phase, courseModule) => startEdit("module", courseModule, { phaseId: phase.id })}
                  onDeleteModule={(courseModule) => confirmDelete("module", courseModule.id, courseModule.title)}
                  onAddMaterial={(phase, courseModule) => startCreate("material", { phaseId: phase.id, moduleId: courseModule.id })}
                  onEditMaterial={(courseModule, material) => startEdit("material", material, { moduleId: courseModule.id })}
                  onDeleteMaterial={(material) => confirmDelete("material", material.id, material.title)}
                  onDeleteAssessment={(assessment) => confirmDelete("assessment", assessment.id, assessment.title)}
                  onSavePhase={(values) => savePhase.mutate(values)}
                  onSaveModule={(values) => saveModule.mutate(values)}
                  onSaveMaterial={(values) => saveMaterial.mutate(values)}
                  onSaveAssessment={(values) => saveAssessment.mutate(values)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CurriculumNavigator({
  loading,
  selectedCourse,
  phases,
  selectedPhaseId,
  selectedModuleId,
  onCreateCourse,
  onAddPhase,
  onAddModule,
  onSelectPhase,
  onSelectModule,
}) {
  return (
    <Card className="p-0 xl:sticky xl:top-24 xl:self-start">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Curriculum</p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">Navigator</h2>
          <p className="mt-1 text-sm text-slate-500">Use phases and modules like a course sidebar.</p>
        </div>
        <Button className="h-9 px-3" disabled={!selectedCourse} onClick={onAddPhase}>
          <Plus size={15} />
          Phase
        </Button>
      </div>

      <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-3">
        {loading ? (
          <BuilderEmptyState title="Loading" description="Fetching curriculum." />
        ) : !selectedCourse ? (
          <BuilderEmptyState
            title="No course selected"
            description="Create or select a course to start."
            action={
              <Button onClick={onCreateCourse}>
                <Plus size={16} />
                Course
              </Button>
            }
          />
        ) : !phases.length ? (
          <BuilderEmptyState
            title="No phases yet"
            description="Add the first phase."
            action={
              <Button onClick={onAddPhase}>
                <Plus size={16} />
                Add Phase
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {phases.map((phase, phaseIndex) => (
              <PhaseNavigatorItem
                key={phase.id}
                phase={phase}
                index={phaseIndex}
                selectedPhaseId={selectedPhaseId}
                selectedModuleId={selectedModuleId}
                onAddModule={() => onAddModule(phase)}
                onSelectPhase={() => onSelectPhase(phase)}
                onSelectModule={(courseModule) => onSelectModule(phase, courseModule)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function PhaseNavigatorItem({ phase, index, selectedPhaseId, selectedModuleId, onAddModule, onSelectPhase, onSelectModule }) {
  const selected = selectedPhaseId === phase.id;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-2">
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-3 rounded-lg p-2 text-left transition",
          selected ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50",
        )}
        onClick={onSelectPhase}
      >
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-sm font-semibold", selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700")}>
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold text-slate-950">{phase.title}</span>
          <span className="mt-1 block text-xs text-slate-500">{phase.modules?.length || 0} modules</span>
        </span>
      </button>

      {selected ? (
        <div className="mt-2 space-y-1 pl-3">
          {(phase.modules || []).map((courseModule) => (
            <button
              key={courseModule.id}
              type="button"
              className={cn(
                "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition",
                selectedModuleId === courseModule.id ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100",
              )}
              onClick={() => onSelectModule(courseModule)}
            >
              <BookOpen size={15} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-medium">{courseModule.title}</span>
                <span className={cn("mt-1 block text-xs", selectedModuleId === courseModule.id ? "text-slate-300" : "text-slate-500")}>
                  {courseModule.learningMaterials?.length || 0} materials / {courseModule.assessment ? "assessment" : "no assessment"}
                </span>
              </span>
              {selectedModuleId === courseModule.id ? <CheckCircle2 size={15} className="shrink-0" /> : null}
            </button>
          ))}

          <Button variant="ghost" className="h-9 w-full justify-start px-2 text-sm" onClick={onAddModule}>
            <Plus size={15} />
            Add Module
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CourseSettingsPanel({ course, stats, onEdit, onDelete }) {
  return (
    <Card className="p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-blue-700" />
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Course Settings</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-950">{course.name}</h2>
            <StatusBadge value={course.isActive ? "ACTIVE" : "INACTIVE"} />
          </div>
          {course.description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">{course.description}</p> : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-[repeat(3,6rem)_auto_auto] sm:items-stretch">
          <MiniStat label="Phases" value={stats.phases} />
          <MiniStat label="Modules" value={stats.modules} />
          <MiniStat label="Materials" value={stats.materials} />
          <Button variant="secondary" className="h-full min-h-10 px-3" onClick={onEdit}>
            <Edit2 size={16} />
            Edit
          </Button>
          <Button variant="danger" className="h-full min-h-10 px-3" onClick={onDelete}>
            <Trash2 size={16} />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PhaseWorkspace({
  selectedPhase,
  selectedModule,
  formMode,
  phaseForm,
  moduleForm,
  materialForm,
  assessmentForm,
  saving,
  onCloseForm,
  onAddPhase,
  onEditPhase,
  onDeletePhase,
  onAddModule,
  onEditModule,
  onDeleteModule,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onDeleteAssessment,
  onSavePhase,
  onSaveModule,
  onSaveMaterial,
  onSaveAssessment,
}) {
  const creatingPhase = formMode.type === "phase" && !formMode.item;
  const editingPhase = selectedPhase && formMode.type === "phase" && formMode.item?.id === selectedPhase.id;
  const creatingModule = selectedPhase && formMode.type === "module" && !formMode.item && formMode.phaseId === selectedPhase.id;

  return (
    <div className="space-y-6">
      {creatingPhase ? (
        <Card>
          <InlineFormPanel title="Create Phase" onCancel={onCloseForm}>
            <PhaseForm form={phaseForm} onSubmit={onSavePhase} saving={saving.phase} />
          </InlineFormPanel>
        </Card>
      ) : null}

      {!selectedPhase && !creatingPhase ? (
        <Card>
          <BuilderEmptyState
            title="No phase selected"
            description="Add or select a phase from the navigator."
            action={
              <Button onClick={onAddPhase}>
                <Plus size={16} />
                Add Phase
              </Button>
            }
          />
        </Card>
      ) : null}

      {selectedPhase ? (
        <>
          <Card className="p-0">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-blue-700" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Selected Phase</p>
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{selectedPhase.title}</h2>
                {selectedPhase.description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">{selectedPhase.description}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onAddModule(selectedPhase)}>
                  <Plus size={16} />
                  Module
                </Button>
                <Button variant="secondary" onClick={() => onEditPhase(selectedPhase)}>
                  <Edit2 size={16} />
                  Edit Phase
                </Button>
                <Button variant="danger" onClick={() => onDeletePhase(selectedPhase)}>
                  <Trash2 size={16} />
                  Delete
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {editingPhase ? (
                <InlineFormPanel title="Edit Phase" onCancel={onCloseForm}>
                  <PhaseForm form={phaseForm} onSubmit={onSavePhase} saving={saving.phase} />
                </InlineFormPanel>
              ) : null}

              {creatingModule ? (
                <InlineFormPanel title="Create Module" onCancel={onCloseForm}>
                  <ModuleForm form={moduleForm} onSubmit={onSaveModule} saving={saving.module} />
                </InlineFormPanel>
              ) : null}
            </div>
          </Card>

          {selectedModule ? (
            <ModuleDetailPanel
              phase={selectedPhase}
              courseModule={selectedModule}
              formMode={formMode}
              moduleForm={moduleForm}
              materialForm={materialForm}
              assessmentForm={assessmentForm}
              saving={saving}
              onCloseForm={onCloseForm}
              onEditModule={() => onEditModule(selectedPhase, selectedModule)}
              onDeleteModule={() => onDeleteModule(selectedModule)}
              onAddMaterial={() => onAddMaterial(selectedPhase, selectedModule)}
              onEditMaterial={(material) => onEditMaterial(selectedModule, material)}
              onDeleteMaterial={onDeleteMaterial}
              onDeleteAssessment={onDeleteAssessment}
              onSaveModule={onSaveModule}
              onSaveMaterial={onSaveMaterial}
              onSaveAssessment={onSaveAssessment}
            />
          ) : (
            <Card>
              <BuilderEmptyState
                title="No modules in this phase"
                description="Create a module to hold learning materials and its assessment."
                action={
                  <Button onClick={() => onAddModule(selectedPhase)}>
                    <Plus size={16} />
                    Add Module
                  </Button>
                }
              />
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

function ModuleDetailPanel({
  courseModule,
  formMode,
  moduleForm,
  materialForm,
  assessmentForm,
  saving,
  onCloseForm,
  onEditModule,
  onDeleteModule,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onDeleteAssessment,
  onSaveModule,
  onSaveMaterial,
  onSaveAssessment,
}) {
  const editingModule = formMode.type === "module" && formMode.item?.id === courseModule.id;
  const showMaterialForm = formMode.type === "material" && (formMode.moduleId || courseModule.id) === courseModule.id;

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-700" />
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Selected Module</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">{courseModule.title}</h2>
          {courseModule.description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">{courseModule.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddMaterial}>
            <Plus size={16} />
            Material
          </Button>
          <Button variant="secondary" onClick={onEditModule}>
            <Edit2 size={16} />
            Edit Module
          </Button>
          <Button variant="danger" onClick={onDeleteModule}>
            <Trash2 size={16} />
            Delete
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {editingModule ? (
          <InlineFormPanel title="Edit Module" onCancel={onCloseForm}>
            <ModuleForm form={moduleForm} onSubmit={onSaveModule} saving={saving.module} />
          </InlineFormPanel>
        ) : null}

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_28rem]">
          <section className="min-w-0 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileText size={17} className="text-blue-700" />
                <h3 className="font-semibold text-slate-950">Learning Materials</h3>
              </div>
              <Button variant="secondary" className="h-9 px-3" onClick={onAddMaterial}>
                <Plus size={15} />
                Add Material
              </Button>
            </div>

            {showMaterialForm ? (
              <InlineFormPanel title={formMode.item ? "Edit Material" : "Create Material"} onCancel={onCloseForm}>
                <MaterialForm form={materialForm} onSubmit={onSaveMaterial} saving={saving.material} />
              </InlineFormPanel>
            ) : null}

            {(courseModule.learningMaterials || []).length ? (
              <div className="space-y-2">
                {(courseModule.learningMaterials || []).map((material) => (
                  <MaterialRow
                    key={material.id}
                    material={material}
                    onEdit={() => onEditMaterial(material)}
                    onDelete={() => onDeleteMaterial(material)}
                  />
                ))}
              </div>
            ) : (
              <BuilderEmptyState title="No materials yet" description="Add a video, article, PDF, link, or code resource." />
            )}
          </section>

          <section className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={17} className="text-blue-700" />
              <h3 className="font-semibold text-slate-950">Assessment</h3>
            </div>
            <AssessmentSummary
              assessment={courseModule.assessment}
              onDelete={() => onDeleteAssessment(courseModule.assessment)}
            />
            <AssessmentForm
              form={assessmentForm}
              onSubmit={onSaveAssessment}
              saving={saving.assessment}
              submitLabel={courseModule.assessment ? "Update Assessment" : "Attach Assessment"}
            />
          </section>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2 text-center">
      <p className="text-lg font-semibold text-slate-950">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
