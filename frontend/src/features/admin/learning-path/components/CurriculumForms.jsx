import { useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/Button.jsx";
import { Field, Input, Select, Textarea } from "../../../../components/ui/Field.jsx";
import { createDefaultQuestion } from "./assessmentQuestionUtils.js";

const materialTypes = [
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
];

const questionTypes = [
  { value: "MCQ", label: "Single choice" },
  { value: "MULTIPLE_ANSWER", label: "Multiple answer" },
  { value: "TRUE_FALSE", label: "True / False" },
  { value: "FILL_IN_BLANK", label: "Fill in blank" },
];

const difficultyOptions = ["EASY", "MEDIUM", "HARD"];
const choiceQuestionTypes = ["MCQ", "MULTIPLE_ANSWER", "TRUE_FALSE"];

export function CourseForm({ form, onSubmit, saving, submitLabel }) {
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Course Name" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </Field>
      <Field label="Description">
        <Textarea {...form.register("description")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Icon">
          <Input {...form.register("icon")} />
        </Field>
        <Field label="Order">
          <Input type="number" {...form.register("order")} />
        </Field>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving" : submitLabel}
      </Button>
    </form>
  );
}

export function PhaseForm({ form, onSubmit, saving }) {
  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Phase Title" error={form.formState.errors.title?.message}>
        <Input {...form.register("title")} />
      </Field>
      <Field label="Description">
        <Textarea {...form.register("description")} />
      </Field>
      <Field label="Order">
        <Input type="number" {...form.register("displayOrder")} />
      </Field>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving" : "Save Phase"}
      </Button>
    </form>
  );
}

export function ModuleForm({ form, onSubmit, saving }) {
  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Module Title" error={form.formState.errors.title?.message}>
        <Input {...form.register("title")} />
      </Field>
      <Field label="Description">
        <Textarea {...form.register("description")} />
      </Field>
      <Field label="Order">
        <Input type="number" {...form.register("displayOrder")} />
      </Field>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving" : "Save Module"}
      </Button>
    </form>
  );
}

export function MaterialForm({ form, onSubmit, saving }) {
  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Material Title" error={form.formState.errors.title?.message}>
        <Input {...form.register("title")} />
      </Field>
      <Field label="Type">
        <Select {...form.register("type")}>
          {materialTypes.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Content URL">
        <Input {...form.register("contentUrl")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Minutes">
          <Input type="number" {...form.register("estimatedMinutes")} />
        </Field>
        <Field label="Order">
          <Input type="number" {...form.register("displayOrder")} />
        </Field>
      </div>
      <Field label="Description">
        <Textarea {...form.register("description")} />
      </Field>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving" : "Save Material"}
      </Button>
    </form>
  );
}

export function AssessmentForm({ form, onSubmit, saving, submitLabel }) {
  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Assessment Title" error={form.formState.errors.title?.message}>
        <Input {...form.register("title")} />
      </Field>
      <Field label="Description">
        <Textarea {...form.register("description")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Duration">
          <Input type="number" {...form.register("durationMinutes")} />
        </Field>
        <Field label="Passing %">
          <Input type="number" {...form.register("passingPercent")} />
        </Field>
        <Field label="Attempts">
          <Input type="number" {...form.register("attemptsAllowed")} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" {...form.register("isPublished")} />
        Published for students
      </label>
      <QuestionBuilder form={form} />
      <Button type="submit" disabled={saving}>
        {saving ? "Saving" : submitLabel}
      </Button>
    </form>
  );
}

function QuestionBuilder({ form }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" });

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">Questions</h3>
          <p className="mt-1 text-sm text-slate-500">Add scored questions students will answer in this assessment.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-3"
          onClick={() => append(createDefaultQuestion(fields.length + 1))}
        >
          <Plus size={15} />
          Add Question
        </Button>
      </div>

      {fields.length ? (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <QuestionEditor key={field.id} form={form} index={index} onRemove={() => remove(index)} />
          ))}
        </div>
      ) : (
        <div className="lms-soft rounded-xl border border-dashed p-4 text-sm text-slate-500">
          No questions yet. Students will not be able to take this assessment until at least one question is added.
        </div>
      )}
    </section>
  );
}

function QuestionEditor({ form, index, onRemove }) {
  const type = form.watch(`questions.${index}.type`);
  const showOptions = choiceQuestionTypes.includes(type);

  return (
    <div className="lms-muted rounded-2xl border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">Question {index + 1}</p>
        <Button type="button" variant="danger" className="h-8 px-2 text-xs" onClick={onRemove}>
          <Trash2 size={14} />
          Remove
        </Button>
      </div>

      <div className="grid gap-3">
        <Field label="Question Text" error={form.formState.errors.questions?.[index]?.text?.message}>
          <Textarea {...form.register(`questions.${index}.text`)} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Type">
            <Select {...form.register(`questions.${index}.type`)}>
              {questionTypes.map((questionType) => (
                <option key={questionType.value} value={questionType.value}>
                  {questionType.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select {...form.register(`questions.${index}.difficulty`)}>
              {difficultyOptions.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Points">
            <Input type="number" min="1" {...form.register(`questions.${index}.points`)} />
          </Field>
        </div>

        <Field label="Order">
          <Input type="number" {...form.register(`questions.${index}.displayOrder`)} />
        </Field>

        {showOptions ? (
          <OptionEditor form={form} questionIndex={index} />
        ) : (
          <Field label="Correct Answer">
            <Input {...form.register(`questions.${index}.correctTextAnswer`)} />
          </Field>
        )}
      </div>
    </div>
  );
}

function OptionEditor({ form, questionIndex }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `questions.${questionIndex}.options`,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700">Answer Options</p>
        <Button type="button" variant="secondary" className="h-8 px-2 text-xs" onClick={() => append({ text: "", isCorrect: false })}>
          <Plus size={14} />
          Option
        </Button>
      </div>
      {fields.map((field, optionIndex) => (
        <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <Input placeholder={`Option ${optionIndex + 1}`} {...form.register(`questions.${questionIndex}.options.${optionIndex}.text`)} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...form.register(`questions.${questionIndex}.options.${optionIndex}.isCorrect`)} />
            Correct
          </label>
          <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => remove(optionIndex)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      {!fields.length ? <p className="text-sm text-slate-500">Add at least one answer option.</p> : null}
    </div>
  );
}
