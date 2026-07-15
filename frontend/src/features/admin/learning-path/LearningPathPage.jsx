import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, FileText, Plus, Settings, Trash2 } from "lucide-react";
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
  ModuleRow,
  PhaseBlock,
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
    if (!selectedPhase) return;
    const stillHasModule = selectedModuleId && selectedPhase.modules.some((courseModule) => courseModule.id === selectedModuleId);
    if (!stillHasModule) setSelectedModuleId("");
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

      <div className="grid gap-6 xl:grid-rows-[1fr_360px]">
        <div className="space-y-5">
          <Card className="p-0">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Curriculum</h2>
                <p className="mt-1 text-sm text-slate-500">Phases work like topics. Modules, materials, and assessment stay nested inside.</p>
              </div>
              <Button disabled={!selectedCourse} onClick={() => startCreate("phase")}>
                <Plus size={16} />
                Add Phase
              </Button>
            </div>

            <div className="space-y-4 p-5">
              {loadingCourseTree ? (
                <BuilderEmptyState title="Loading curriculum" description="Loading the selected course structure." />
              ) : null}

              {!loadingCourseTree && !selectedCourse ? (
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
              ) : null}

              {!loadingCourseTree && selectedCourse && formMode.type === "phase" && !formMode.item ? (
                <InlineFormPanel title="Create Phase" onCancel={closeForm}>
                  <PhaseForm form={phaseForm} onSubmit={(values) => savePhase.mutate(values)} saving={savePhase.isPending} />
                </InlineFormPanel>
              ) : null}

              {!loadingCourseTree && selectedCourse && !phases.length && formMode.type !== "phase" ? (
                <BuilderEmptyState
                  title="No phases yet"
                  description="Add the first phase to start building the curriculum."
                  action={
                    <Button onClick={() => startCreate("phase")}>
                      <Plus size={16} />
                      Add Phase
                    </Button>
                  }
                />
              ) : null}

              {!loadingCourseTree && phases.map((phase) => {
                const phaseOpen = selectedPhaseId === phase.id;
                const showCreateModuleForm = formMode.type === "module" && !formMode.item && formMode.phaseId === phase.id;
                const showEditPhaseForm = formMode.type === "phase" && formMode.item?.id === phase.id;

                return (
                  <PhaseBlock
                    key={phase.id}
                    phase={phase}
                    open={phaseOpen}
                    onToggle={() => {
                      setSelectedPhaseId(phase.id);
                      setSelectedModuleId("");
                    }}
                    onAddModule={() => startCreate("module", { phaseId: phase.id })}
                    onEdit={() => startEdit("phase", phase)}
                    onDelete={() => confirmDelete("phase", phase.id, phase.title)}
                  >
                    {showEditPhaseForm ? (
                      <InlineFormPanel title="Edit Phase" onCancel={closeForm}>
                        <PhaseForm form={phaseForm} onSubmit={(values) => savePhase.mutate(values)} saving={savePhase.isPending} />
                      </InlineFormPanel>
                    ) : null}

                    {showCreateModuleForm ? (
                      <InlineFormPanel title="Create Module" onCancel={closeForm}>
                        <ModuleForm form={moduleForm} onSubmit={(values) => saveModule.mutate(values)} saving={saveModule.isPending} />
                      </InlineFormPanel>
                    ) : null}

                    {!phase.modules?.length && !showCreateModuleForm ? (
                      <BuilderEmptyState
                        title="No modules in this phase"
                        description="Add a module to hold lessons, materials, and its assessment."
                        action={
                          <Button variant="secondary" onClick={() => startCreate("module", { phaseId: phase.id })}>
                            <Plus size={16} />
                            Add Module
                          </Button>
                        }
                      />
                    ) : null}

                    <div className="space-y-3">
                      {(phase.modules || []).map((courseModule) => {
                        const moduleOpen = selectedModuleId === courseModule.id;
                        const showEditModuleForm = formMode.type === "module" && formMode.item?.id === courseModule.id;
                        const showMaterialForm = formMode.type === "material" && (formMode.moduleId || selectedModuleId) === courseModule.id;

                        return (
                          <ModuleRow
                            key={courseModule.id}
                            courseModule={courseModule}
                            open={moduleOpen}
                            onToggle={() => {
                              setSelectedPhaseId(phase.id);
                              setSelectedModuleId(courseModule.id);
                            }}
                            onAddMaterial={() => startCreate("material", { phaseId: phase.id, moduleId: courseModule.id })}
                            onEdit={() => startEdit("module", courseModule, { phaseId: phase.id })}
                            onDelete={() => confirmDelete("module", courseModule.id, courseModule.title)}
                          >
                            {showEditModuleForm ? (
                              <InlineFormPanel title="Edit Module" onCancel={closeForm}>
                                <ModuleForm form={moduleForm} onSubmit={(values) => saveModule.mutate(values)} saving={saveModule.isPending} />
                              </InlineFormPanel>
                            ) : null}

                            <div className="grid gap-5 2xl:grid-cols-[1fr_360px]">
                              <section className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <FileText size={17} className="text-blue-700" />
                                    <h3 className="font-semibold text-slate-950">Learning Materials</h3>
                                  </div>
                                  <Button
                                    variant="secondary"
                                    className="h-9 px-3"
                                    onClick={() => startCreate("material", { phaseId: phase.id, moduleId: courseModule.id })}
                                  >
                                    <Plus size={15} />
                                    Add Material
                                  </Button>
                                </div>

                                {showMaterialForm ? (
                                  <InlineFormPanel title={formMode.item ? "Edit Material" : "Create Material"} onCancel={closeForm}>
                                    <MaterialForm
                                      form={materialForm}
                                      onSubmit={(values) => saveMaterial.mutate(values)}
                                      saving={saveMaterial.isPending}
                                    />
                                  </InlineFormPanel>
                                ) : null}

                                {(courseModule.learningMaterials || []).length ? (
                                  <div className="space-y-2">
                                    {(courseModule.learningMaterials || []).map((material) => (
                                      <MaterialRow
                                        key={material.id}
                                        material={material}
                                        onEdit={() => startEdit("material", material, { moduleId: courseModule.id })}
                                        onDelete={() => confirmDelete("material", material.id, material.title)}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <BuilderEmptyState title="No materials yet" description="Add a video, article, PDF, link, or code resource." />
                                )}
                              </section>

                              <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <ClipboardList size={17} className="text-blue-700" />
                                  <h3 className="font-semibold text-slate-950">Assessment</h3>
                                </div>
                                <AssessmentSummary
                                  assessment={courseModule.assessment}
                                  onDelete={() => confirmDelete("assessment", courseModule.assessment.id, courseModule.assessment.title)}
                                />
                                {moduleOpen ? (
                                  <AssessmentForm
                                    form={assessmentForm}
                                    onSubmit={(values) => saveAssessment.mutate(values)}
                                    saving={saveAssessment.isPending}
                                    submitLabel={courseModule.assessment ? "Update Assessment" : "Attach Assessment"}
                                  />
                                ) : null}
                              </section>
                            </div>
                          </ModuleRow>
                        );
                      })}
                    </div>
                  </PhaseBlock>
                );
              })}
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Settings size={18} className="text-blue-700" />
              <div>
                <h2 className="font-semibold text-slate-950">Course Settings</h2>
                <p className="text-sm text-slate-500">Manage the selected course.</p>
              </div>
            </div>

            {showCourseForm ? (
              <CourseForm
                form={courseForm}
                onSubmit={(values) => saveCourse.mutate(values)}
                saving={saveCourse.isPending}
                submitLabel={formMode.item ? "Update Course" : "Create Course"}
              />
            ) : loadingCourseTree ? (
              <BuilderEmptyState title="Loading course settings" description="Loading the selected course details." />
            ) : selectedCourse ? (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-950">{selectedCourse.name}</h3>
                    <StatusBadge value={selectedCourse.isActive ? "ACTIVE" : "INACTIVE"} />
                  </div>
                  {selectedCourse.description ? <p className="mt-2 text-sm text-slate-500">{selectedCourse.description}</p> : null}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-lg font-semibold text-slate-950">{courseStats.phases}</p>
                    <p className="text-xs text-slate-500">Phases</p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-lg font-semibold text-slate-950">{courseStats.modules}</p>
                    <p className="text-xs text-slate-500">Modules</p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-lg font-semibold text-slate-950">{courseStats.materials}</p>
                    <p className="text-xs text-slate-500">Materials</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Button variant="secondary" onClick={() => startEdit("course", selectedCourse)}>
                    <Settings size={16} />
                    Edit Course
                  </Button>
                  <Button variant="danger" onClick={() => confirmDelete("course", selectedCourse.id, selectedCourse.name)}>
                    <Trash2 size={16} />
                    Delete Course
                  </Button>
                </div>
              </div>
            ) : (
              <BuilderEmptyState
                title="No course selected"
                description="Create a course to start adding phases and modules."
                action={
                  <Button onClick={() => startCreate("course")}>
                    <Plus size={16} />
                    Create Course
                  </Button>
                }
              />
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
