import { z } from "zod";

export const createPhaseSchema = z.object({
  params: z.object({ subjectId: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    displayOrder: z.number().int().default(0),
  }),
});

export const updatePhaseSchema = z.object({
  params: z.object({ phaseId: z.string().min(1) }),
  body: createPhaseSchema.shape.body.partial(),
});

export const createModuleSchema = z.object({
  params: z.object({ phaseId: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    displayOrder: z.number().int().default(0),
  }),
});

export const updateModuleSchema = z.object({
  params: z.object({ moduleId: z.string().min(1) }),
  body: createModuleSchema.shape.body.partial(),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const phaseIdParamSchema = z.object({
  params: z.object({ phaseId: z.string().min(1) }),
});

export const moduleIdParamSchema = z.object({
  params: z.object({ moduleId: z.string().min(1) }),
});
