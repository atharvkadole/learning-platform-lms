import { z } from "zod";

export const subjectSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    icon: z.string().optional(),
    order: z.number().int().default(0),
    isActive: z.boolean().default(true),
  }),
});

export const updateSubjectSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: subjectSchema.shape.body.partial(),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
