import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { broadcastPlatformEvent } from "../events/eventBus.js";
import { recomputeModuleProgressForAssignedStudents } from "../progress/progress.service.js";
import * as service from "./assessment.service.js";
import { assessmentSchema, idParamSchema, submitAttemptSchema, updateAssessmentSchema } from "./assessment.validators.js";

const admin = Router();
admin.use(requireAuth, requireRole("ADMIN"));

admin.get("/", asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await service.listAdminAssessments() });
}));

admin.post("/", validate(assessmentSchema), asyncHandler(async (req, res) => {
  const assessment = await service.createAssessment(req.validated.body);
  broadcastPlatformEvent("learning-content", "assessment.created", {
    moduleId: assessment.moduleId,
    assessmentId: assessment.id,
  });
  res.status(201).json({ success: true, data: assessment, message: "Assessment created" });
}));

admin.patch("/:id", validate(updateAssessmentSchema), asyncHandler(async (req, res) => {
  const assessment = await service.updateAssessment(req.validated.params.id, req.validated.body);
  broadcastPlatformEvent("learning-content", "assessment.updated", {
    moduleId: assessment.moduleId,
    assessmentId: assessment.id,
  });
  res.json({ success: true, data: assessment, message: "Assessment updated" });
}));

admin.delete("/:id", validate(idParamSchema), asyncHandler(async (req, res) => {
  const { prisma } = await import("../../config/prisma.js");
  const deleted = await prisma.$transaction(async (tx) => {
    const existing = await tx.assessment.findUniqueOrThrow({ where: { id: req.validated.params.id } });
    await tx.assessment.delete({ where: { id: req.validated.params.id } });
    await recomputeModuleProgressForAssignedStudents(existing.moduleId, tx);
    return existing;
  });
  broadcastPlatformEvent("learning-content", "assessment.deleted", {
    moduleId: deleted.moduleId,
    assessmentId: deleted.id,
  });
  res.json({ success: true, message: "Assessment deleted" });
}));

const student = Router();
student.use(requireAuth, requireRole("STUDENT"));

student.get("/", asyncHandler(async (req, res) => {
  const assessments = await service.getStudentAssessments(req.user.studentProfile.id);
  res.json({ success: true, data: assessments });
}));

student.post("/:id/start", validate(idParamSchema), asyncHandler(async (req, res) => {
  const attempt = await service.startAttempt(req.user.studentProfile.id, req.validated.params.id);
  res.status(201).json({ success: true, data: attempt, message: "Assessment started" });
}));

student.post("/attempts/:attemptId/submit", validate(submitAttemptSchema), asyncHandler(async (req, res) => {
  const attempt = await service.submitAttempt(
    req.user.studentProfile.id,
    req.validated.params.attemptId,
    req.validated.body.answers,
  );
  broadcastPlatformEvent("learning-content", "assessment.submitted", {
    assessmentId: attempt.assessmentId,
    studentId: req.user.studentProfile.id,
  });
  res.json({ success: true, data: attempt, message: "Assessment submitted" });
}));

export default { admin, student };
