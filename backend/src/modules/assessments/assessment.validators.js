import { z } from "zod";

const optionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
});

const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["MCQ", "MULTIPLE_ANSWER", "TRUE_FALSE", "FILL_IN_BLANK", "CODING", "ESSAY", "FILE_UPLOAD", "SQL_QUERY"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  points: z.number().positive().default(1),
  correctTextAnswer: z.string().optional(),
  displayOrder: z.number().int().default(0),
  options: z.array(optionSchema).default([]),
});

export const assessmentSchema = z.object({
  body: z.object({
    moduleId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
    passingPercent: z.number().min(0).max(100).default(60),
    negativeMarking: z.boolean().default(false),
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
    attemptsAllowed: z.number().int().positive().default(1),
    showResult: z.boolean().default(true),
    showAnswers: z.boolean().default(false),
    isPublished: z.boolean().default(false),
    questions: z.array(questionSchema).default([]),
  }),
});

export const updateAssessmentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: assessmentSchema.shape.body.partial(),
});

export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const submitAttemptSchema = z.object({
  params: z.object({ attemptId: z.string().min(1) }),
  body: z.object({
    answers: z.array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionIds: z.array(z.string()).default([]),
        textAnswer: z.string().optional(),
      }),
    ),
  }),
});
