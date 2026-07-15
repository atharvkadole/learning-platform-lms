import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../../components/ui/Card.jsx";
import { Field, Select } from "../../../components/ui/Field.jsx";
import { EmptyState } from "../../../components/ui/Page.jsx";
import { StatusBadge } from "../../../components/ui/StatusBadge.jsx";
import { api } from "../../../lib/api.js";
import { AssessmentForm } from "../learning-path/components/CurriculumForms.jsx";
import {
  normalizeQuestionForForm,
  normalizeQuestionsForPayload,
} from "../learning-path/components/assessmentQuestionUtils.js";

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

const schema = z.object({
  title: z.string().min(1, "Assessment title is required"),
  description: z.string().optional(),
  durationMinutes: optionalNumber,
  passingPercent: z.coerce.number().min(0).max(100),
  attemptsAllowed: z.coerce.number().int().positive(),
  isPublished: z.boolean().default(true),
  questions: z.array(questionSchema).default([]),
});

const defaultAssessmentValues = {
  title: "",
  description: "",
  durationMinutes: "",
  passingPercent: 60,
  attemptsAllowed: 1,
  isPublished: true,
  questions: [],
};

function cleanAssessmentPayload(values) {
  return {
    ...values,
    description: values.description?.trim() || undefined,
    durationMinutes: values.durationMinutes || undefined,
    questions: normalizeQuestionsForPayload(values.questions),
  };
}

function AssessmentRecord({ assessment, onOpen, onDelete }) {
  const courseName = assessment.module?.phase?.subject?.name || "-";
  const phaseTitle = assessment.module?.phase?.title || "-";
  const moduleTitle = assessment.module?.title || "-";

  return (
    <article className="lms-panel rounded-2xl border p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-semibold text-slate-950">{assessment.title}</h3>
            <StatusBadge value={assessment.isPublished ? "ACTIVE" : "INACTIVE"} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {assessment._count?.questions || 0} questions
            {assessment.durationMinutes ? ` / ${assessment.durationMinutes} min` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button variant="secondary" className="h-9 px-3" onClick={onOpen}>
            <Edit2 size={15} />
            Edit
          </Button>
          <Button variant="danger" className="h-9 px-3" onClick={onDelete}>
            <Trash2 size={15} />
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div className="lms-soft min-w-0 rounded-xl border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Course</p>
          <p className="mt-1 truncate font-medium text-slate-800">{courseName}</p>
        </div>
        <div className="lms-soft min-w-0 rounded-xl border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phase</p>
          <p className="mt-1 truncate font-medium text-slate-800">{phaseTitle}</p>
        </div>
        <div className="lms-soft min-w-0 rounded-xl border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Module</p>
          <p className="mt-1 truncate font-medium text-slate-800">{moduleTitle}</p>
        </div>
      </div>
    </article>
  );
}

export function AssessmentsPage() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");

  const courses = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await api.get("/admin/subjects?limit=100")).data.data,
  });

  const tree = useQuery({
    queryKey: ["subject-tree", selectedCourseId],
    enabled: Boolean(selectedCourseId),
    queryFn: async () => (await api.get(`/admin/learning-path/subjects/${selectedCourseId}/tree`)).data.data,
  });

  const assessments = useQuery({
    queryKey: ["admin-assessments"],
    queryFn: async () => (await api.get("/admin/assessments")).data.data,
  });

  const phases = useMemo(() => tree.data?.phases || [], [tree.data]);
  const selectedPhase = useMemo(
    () => phases.find((phase) => phase.id === selectedPhaseId) || null,
    [phases, selectedPhaseId],
  );
  const modules = useMemo(() => selectedPhase?.modules || [], [selectedPhase]);
  const selectedModule = useMemo(
    () => modules.find((courseModule) => courseModule.id === selectedModuleId) || null,
    [modules, selectedModuleId],
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultAssessmentValues,
  });

  useEffect(() => {
    if (!courses.data?.length) {
      setSelectedCourseId("");
      return;
    }

    setSelectedCourseId((currentId) =>
      currentId && courses.data.some((course) => course.id === currentId) ? currentId : courses.data[0].id,
    );
  }, [courses.data]);

  useEffect(() => {
    if (!selectedCourseId) {
      setSelectedPhaseId("");
      setSelectedModuleId("");
      return;
    }
    if (!tree.data) return;
    if (!phases.length) {
      setSelectedPhaseId("");
      setSelectedModuleId("");
      return;
    }

    setSelectedPhaseId((currentId) =>
      currentId && phases.some((phase) => phase.id === currentId) ? currentId : phases[0].id,
    );
  }, [phases, selectedCourseId, tree.data]);

  useEffect(() => {
    if (!selectedPhaseId) {
      setSelectedModuleId("");
      return;
    }
    if (!tree.data) return;
    if (!modules.length) {
      setSelectedModuleId("");
      return;
    }

    setSelectedModuleId((currentId) =>
      currentId && modules.some((courseModule) => courseModule.id === currentId) ? currentId : modules[0].id,
    );
  }, [modules, selectedPhaseId, tree.data]);

  useEffect(() => {
    if (selectedModule?.assessment) {
      form.reset({
        title: selectedModule.assessment.title || "",
        description: selectedModule.assessment.description || "",
        durationMinutes: selectedModule.assessment.durationMinutes ?? "",
        passingPercent: selectedModule.assessment.passingPercent ?? 60,
        attemptsAllowed: selectedModule.assessment.attemptsAllowed ?? 1,
        isPublished: selectedModule.assessment.isPublished ?? true,
        questions: (selectedModule.assessment.questions || []).map(normalizeQuestionForForm),
      });
      return;
    }

    form.reset({
      ...defaultAssessmentValues,
      title: selectedModule ? `${selectedModule.title} Assessment` : "",
    });
  }, [form, selectedModule]);

  const refreshAssessmentData = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-assessments"] });
    if (selectedCourseId) {
      queryClient.invalidateQueries({ queryKey: ["subject-tree", selectedCourseId] });
    }
  };

  const saveAssessment = useMutation({
    mutationFn: (values) => {
      if (!selectedModule) throw new Error("Select a module before saving an assessment");
      const payload = cleanAssessmentPayload(values);
      if (selectedModule.assessment) {
        return api.patch(`/admin/assessments/${selectedModule.assessment.id}`, payload);
      }
      return api.post("/admin/assessments", {
        ...payload,
        moduleId: selectedModule.id,
      });
    },
    onSuccess: () => {
      toast.success(selectedModule?.assessment ? "Assessment updated" : "Assessment attached");
      refreshAssessmentData();
    },
    onError: (error) => toast.error(error.response?.data?.message || error.message || "Could not save assessment"),
  });

  const deleteAssessment = useMutation({
    mutationFn: (id) => api.delete(`/admin/assessments/${id}`),
    onSuccess: () => {
      toast.success("Assessment deleted");
      refreshAssessmentData();
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not delete assessment"),
  });

  const openAssessment = (assessment) => {
    const subjectId = assessment.module?.phase?.subject?.id;
    const phaseId = assessment.module?.phase?.id;
    const moduleId = assessment.module?.id;
    if (!subjectId || !phaseId || !moduleId) {
      toast.error("This assessment is missing course structure data");
      return;
    }
    setSelectedCourseId(subjectId);
    setSelectedPhaseId(phaseId);
    setSelectedModuleId(moduleId);
  };

  const confirmDelete = (assessment) => {
    if (window.confirm(`Delete "${assessment.title}"?`)) {
      deleteAssessment.mutate(assessment.id);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader
          title="Attach Assessment"
          description="Choose a course, phase, and module, then attach or update its assessment."
        />
        <div className="space-y-4">
          <Field label="Course">
            <Select
              value={selectedCourseId}
              onChange={(event) => {
                setSelectedCourseId(event.target.value);
                setSelectedPhaseId("");
                setSelectedModuleId("");
              }}
            >
              {(courses.data || []).length ? (
                courses.data.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))
              ) : (
                <option value="">Create a course first</option>
              )}
            </Select>
          </Field>

          <Field label="Phase">
            <Select
              value={selectedPhaseId}
              onChange={(event) => {
                setSelectedPhaseId(event.target.value);
                setSelectedModuleId("");
              }}
              disabled={!phases.length}
            >
              {phases.length ? (
                phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.title}
                  </option>
                ))
              ) : (
                <option value="">Create a phase first</option>
              )}
            </Select>
          </Field>

          <Field label="Module">
            <Select
              value={selectedModuleId}
              onChange={(event) => setSelectedModuleId(event.target.value)}
              disabled={!modules.length}
            >
              {modules.length ? (
                modules.map((courseModule) => (
                  <option key={courseModule.id} value={courseModule.id}>
                    {courseModule.title}
                  </option>
                ))
              ) : (
                <option value="">Create a module first</option>
              )}
            </Select>
          </Field>

          <div className="lms-soft rounded-xl border p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-950">
                {selectedModule ? selectedModule.title : "No module selected"}
              </p>
              {selectedModule?.assessment ? <StatusBadge value={selectedModule.assessment.isPublished ? "ACTIVE" : "INACTIVE"} /> : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {selectedModule?.assessment
                ? "This module already has an assessment. Saving will update it."
                : "Attach one assessment shell to the selected module."}
            </p>
          </div>

          <AssessmentForm
            form={form}
            onSubmit={(values) => saveAssessment.mutate(values)}
            saving={saveAssessment.isPending || !selectedModule}
            submitLabel={selectedModule?.assessment ? "Update Assessment" : "Attach Assessment"}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Assessments" description="Open an assessment to edit it through its course path." />
        <div className="grid gap-3">
          {(assessments.data || []).map((assessment) => (
            <AssessmentRecord
              key={assessment.id}
              assessment={assessment}
              onOpen={() => openAssessment(assessment)}
              onDelete={() => confirmDelete(assessment)}
            />
          ))}

          {!assessments.isLoading && !(assessments.data || []).length ? (
            <EmptyState title="No assessments yet" description="Select a module, attach an assessment, then manage it from this list." />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
