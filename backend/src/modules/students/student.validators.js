import { z } from "zod";

export const createStudentSchema = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    username: z.string().min(3).optional(),
    password: z.string().min(8).default("Student@12345"),
    phone: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    enrollmentDate: z.coerce.date().optional(),
    subjectIds: z.array(z.string()).default([]),
  }),
});

export const updateStudentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    username: z.string().min(3).optional(),
    phone: z.string().nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    subjectIds: z.array(z.string()).optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
