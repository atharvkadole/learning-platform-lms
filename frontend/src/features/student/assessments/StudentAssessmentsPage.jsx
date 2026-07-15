import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, PlayCircle, RotateCcw, Send, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../../components/ui/Card.jsx";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../../components/ui/Page.jsx";
import { ProgressBar } from "../../../components/ui/ProgressBar.jsx";
import { StatusBadge } from "../../../components/ui/StatusBadge.jsx";
import { Textarea } from "../../../components/ui/Field.jsx";
import { api } from "../../../lib/api.js";
import { queryKeys } from "../../../lib/queryKeys.js";
import { cn, formatPercent } from "../../../lib/utils.js";

function getAssessmentMeta(assessment) {
  const latestAttempt = assessment.attempts?.[0] || null;
  const inProgress = assessment.attempts?.find((attempt) => attempt.status === "IN_PROGRESS") || null;
  const attemptsUsed = assessment.attempts?.length || 0;
  const attemptsAllowed = assessment.attemptsAllowed || 1;
  const attemptsLeft = Math.max(0, attemptsAllowed - attemptsUsed);
  const questionCount = assessment._count?.questions || assessment.questions?.length || 0;

  return {
    latestAttempt,
    inProgress,
    attemptsAllowed,
    attemptsUsed,
    attemptsLeft,
    questionCount,
    canStart: Boolean(inProgress) || attemptsLeft > 0,
    status: inProgress?.status || latestAttempt?.status || "NOT_STARTED",
  };
}

export function StudentAssessmentsPage() {
  const queryClient = useQueryClient();
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [lastResult, setLastResult] = useState(null);

  const assessments = useQuery({
    queryKey: queryKeys.studentAssessments,
    queryFn: async () => (await api.get("/student/assessments")).data.data,
  });

  const startAttempt = useMutation({
    mutationFn: (assessmentId) => api.post(`/student/assessments/${assessmentId}/start`),
    onSuccess: (response) => {
      setActiveAttempt(response.data.data);
      setAnswers({});
      setLastResult(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.studentAssessments });
      toast.success("Assessment opened");
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not open assessment"),
  });

  const submitAttempt = useMutation({
    mutationFn: ({ attemptId, payload }) => api.post(`/student/assessments/attempts/${attemptId}/submit`, payload),
    onSuccess: (response) => {
      setLastResult(response.data.data);
      setActiveAttempt(null);
      setAnswers({});
      queryClient.invalidateQueries({ queryKey: queryKeys.studentAssessments });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard });
      toast.success("Assessment submitted");
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not submit assessment"),
  });

  const assessmentList = assessments.data || [];
  const activeQuestions = useMemo(() => activeAttempt?.assessment?.questions || [], [activeAttempt]);
  const answeredCount = useMemo(
    () =>
      activeQuestions.filter((question) => {
        const answer = answers[question.id];
        return Boolean(answer?.textAnswer?.trim()) || Boolean(answer?.selectedOptionIds?.length);
      }).length,
    [activeQuestions, answers],
  );

  function updateAnswer(questionId, value) {
    setAnswers((current) => ({ ...current, [questionId]: { ...(current[questionId] || {}), ...value } }));
  }

  function submitActiveAttempt() {
    if (!activeAttempt) return;
    const payload = {
      answers: activeQuestions.map((question) => ({
        questionId: question.id,
        selectedOptionIds: answers[question.id]?.selectedOptionIds || [],
        textAnswer: answers[question.id]?.textAnswer || "",
      })),
    };
    submitAttempt.mutate({ attemptId: activeAttempt.id, payload });
  }

  if (assessments.isLoading) {
    return <LoadingState title="Loading assessments" description="Checking published assessments for your assigned courses." />;
  }

  if (assessments.isError) {
    return (
      <ErrorState
        title="Could not load assessments"
        description={assessments.error?.response?.data?.message || "Refresh and try again."}
        onRetry={() => assessments.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assessments" description="Start, resume, and submit assessments for your assigned modules." />

      {lastResult ? <ResultPanel result={lastResult} /> : null}

      {activeAttempt ? (
        <AttemptPanel
          attempt={activeAttempt}
          answers={answers}
          answeredCount={answeredCount}
          onAnswer={updateAnswer}
          onClose={() => setActiveAttempt(null)}
          onSubmit={submitActiveAttempt}
          saving={submitAttempt.isPending}
        />
      ) : null}

      <Card>
        <CardHeader title="Available Assessments" description="Open an assessment, answer the questions, then submit for scoring." />
        <div className="grid gap-3">
          {assessmentList.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              starting={startAttempt.isPending}
              onStart={() => startAttempt.mutate(assessment.id)}
            />
          ))}
          {!assessmentList.length ? (
            <EmptyState title="No assessments available" description="Published assessments for your assigned courses will appear here." />
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function ResultPanel({ result }) {
  const passed = result.passing;
  const Icon = passed ? CheckCircle2 : XCircle;

  return (
    <div className="lms-panel rounded-2xl border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Icon className={passed ? "text-emerald-700" : "text-amber-700"} size={22} />
          <div>
            <p className="font-semibold text-slate-950">{passed ? "Assessment passed" : "Assessment submitted"}</p>
            <p className="mt-1 text-sm text-slate-500">
              Score {formatPercent(result.score)}. {passed ? "Module progress has been updated." : "Review the score and retry if attempts remain."}
            </p>
          </div>
        </div>
        <StatusBadge value={passed ? "MASTERED" : "GRADED"} />
      </div>
    </div>
  );
}

function AssessmentCard({ assessment, starting, onStart }) {
  const meta = getAssessmentMeta(assessment);
  const moduleName = assessment.module?.title || "Module";
  const subjectName = assessment.module?.phase?.subject?.name || "Course";
  const buttonLabel = meta.inProgress
    ? "Resume Assessment"
    : meta.latestAttempt?.status === "GRADED"
      ? meta.canStart
        ? "Retake Assessment"
        : "Attempts Used"
      : "Start Assessment";
  const disabled = starting || !meta.canStart || meta.questionCount === 0;

  return (
    <article className="lms-panel rounded-2xl border p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-950">{assessment.title}</h3>
            <StatusBadge value={meta.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {subjectName} / {moduleName}
          </p>
          {assessment.description ? <p className="mt-2 max-w-3xl text-sm text-slate-500">{assessment.description}</p> : null}
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <InfoBox label="Questions" value={meta.questionCount} />
            <InfoBox label="Attempts" value={`${meta.attemptsUsed}/${meta.attemptsAllowed}`} />
            <InfoBox label="Passing" value={`${Math.round(assessment.passingPercent || 0)}%`} />
          </div>
          {meta.latestAttempt?.status === "GRADED" ? (
            <p className="mt-3 text-sm font-medium text-slate-700">
              Last score: {formatPercent(meta.latestAttempt.score)} / {meta.latestAttempt.passing ? "Passed" : "Not passed"}
            </p>
          ) : null}
          {meta.questionCount === 0 ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
              This assessment is attached, but no questions have been added yet.
            </p>
          ) : null}
        </div>

        <Button className="w-full xl:w-auto" variant={meta.inProgress ? "primary" : "secondary"} disabled={disabled} onClick={onStart}>
          {meta.inProgress ? <PlayCircle size={16} /> : meta.latestAttempt?.status === "GRADED" ? <RotateCcw size={16} /> : <PlayCircle size={16} />}
          {disabled && meta.questionCount === 0 ? "No Questions" : buttonLabel}
        </Button>
      </div>
    </article>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="lms-soft rounded-xl border px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function AttemptPanel({ attempt, answers, answeredCount, onAnswer, onClose, onSubmit, saving }) {
  const questions = attempt.assessment?.questions || [];
  const progress = questions.length ? (answeredCount / questions.length) * 100 : 0;

  return (
    <Card className="border-blue-200">
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-blue-700">
            <ClipboardList size={18} />
            <p className="text-xs font-semibold uppercase tracking-wide">Active Assessment</p>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{attempt.assessment?.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Answer all questions you can. Submit when ready; scoring updates your module progress.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button disabled={saving || !questions.length} onClick={onSubmit}>
            <Send size={16} />
            {saving ? "Submitting" : "Submit"}
          </Button>
        </div>
      </div>

      <ProgressBar value={progress} label={`${answeredCount} of ${questions.length} answered`} />

      <div className="mt-5 space-y-4">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            answer={answers[question.id] || {}}
            onAnswer={(value) => onAnswer(question.id, value)}
          />
        ))}
        {!questions.length ? (
          <EmptyState title="No questions yet" description="This assessment cannot be submitted until an instructor adds questions." />
        ) : null}
      </div>
    </Card>
  );
}

function QuestionCard({ question, index, answer, onAnswer }) {
  const selectedOptionIds = answer.selectedOptionIds || [];
  const isMultiple = question.type === "MULTIPLE_ANSWER";
  const isChoice = ["MCQ", "MULTIPLE_ANSWER", "TRUE_FALSE"].includes(question.type);

  function toggleOption(optionId) {
    if (isMultiple) {
      const next = selectedOptionIds.includes(optionId)
        ? selectedOptionIds.filter((id) => id !== optionId)
        : [...selectedOptionIds, optionId];
      onAnswer({ selectedOptionIds: next });
      return;
    }
    onAnswer({ selectedOptionIds: [optionId] });
  }

  return (
    <section className="lms-muted rounded-2xl border p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {index + 1}</p>
          <h3 className="mt-1 font-semibold text-slate-950">{question.text}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={question.difficulty} />
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{question.points} pts</span>
        </div>
      </div>

      {isChoice && question.options?.length ? (
        <div className="grid gap-2">
          {question.options.map((option) => {
            const selected = selectedOptionIds.includes(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition",
                  selected ? "border-blue-300 bg-blue-50 text-blue-950" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                <input
                  type={isMultiple ? "checkbox" : "radio"}
                  name={question.id}
                  checked={selected}
                  className="mt-1"
                  onChange={() => toggleOption(option.id)}
                />
                <span>{option.text}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <Textarea
          value={answer.textAnswer || ""}
          placeholder={question.type === "FILL_IN_BLANK" ? "Type your answer" : "Write your response"}
          onChange={(event) => onAnswer({ textAnswer: event.target.value })}
        />
      )}
    </section>
  );
}
