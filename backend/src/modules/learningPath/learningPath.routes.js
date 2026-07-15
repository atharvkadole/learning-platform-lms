import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { broadcastPlatformEvent } from "../events/eventBus.js";
import {
  createModuleSchema,
  createPhaseSchema,
  idParamSchema,
  moduleIdParamSchema,
  phaseIdParamSchema,
  updateModuleSchema,
  updatePhaseSchema,
} from "./learningPath.validators.js";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/subjects/:id/tree",
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const subject = await prisma.subject.findUniqueOrThrow({
      where: { id: req.validated.params.id },
      include: {
        phases: {
          orderBy: { displayOrder: "asc" },
          include: {
            modules: {
              orderBy: { displayOrder: "asc" },
              include: {
                learningMaterials: { orderBy: { displayOrder: "asc" } },
                assessment: { include: { questions: { include: { options: true } } } },
              },
            },
          },
        },
      },
    });
    res.json({ success: true, data: subject });
  }),
);

router.post(
  "/subjects/:subjectId/phases",
  validate(createPhaseSchema),
  asyncHandler(async (req, res) => {
    const phase = await prisma.phase.create({
      data: { ...req.validated.body, subjectId: req.validated.params.subjectId },
    });
    broadcastPlatformEvent("learning-content", "phase.created", {
      subjectId: req.validated.params.subjectId,
      phaseId: phase.id,
    });
    res.status(201).json({ success: true, data: phase, message: "Phase created" });
  }),
);

router.patch(
  "/phases/:phaseId",
  validate(updatePhaseSchema),
  asyncHandler(async (req, res) => {
    const phase = await prisma.phase.update({
      where: { id: req.validated.params.phaseId },
      data: req.validated.body,
    });
    broadcastPlatformEvent("learning-content", "phase.updated", { phaseId: phase.id, subjectId: phase.subjectId });
    res.json({ success: true, data: phase, message: "Phase updated" });
  }),
);

router.delete(
  "/phases/:phaseId",
  validate(phaseIdParamSchema),
  asyncHandler(async (req, res) => {
    await prisma.phase.delete({ where: { id: req.validated.params.phaseId } });
    broadcastPlatformEvent("learning-content", "phase.deleted", { phaseId: req.validated.params.phaseId });
    res.json({ success: true, message: "Phase deleted" });
  }),
);

router.post(
  "/phases/:phaseId/modules",
  validate(createModuleSchema),
  asyncHandler(async (req, res) => {
    const courseModule = await prisma.courseModule.create({
      data: { ...req.validated.body, phaseId: req.validated.params.phaseId },
    });
    broadcastPlatformEvent("learning-content", "module.created", {
      phaseId: req.validated.params.phaseId,
      moduleId: courseModule.id,
    });
    res.status(201).json({ success: true, data: courseModule, message: "Module created" });
  }),
);

router.patch(
  "/modules/:moduleId",
  validate(updateModuleSchema),
  asyncHandler(async (req, res) => {
    const courseModule = await prisma.courseModule.update({
      where: { id: req.validated.params.moduleId },
      data: req.validated.body,
    });
    broadcastPlatformEvent("learning-content", "module.updated", {
      phaseId: courseModule.phaseId,
      moduleId: courseModule.id,
    });
    res.json({ success: true, data: courseModule, message: "Module updated" });
  }),
);

router.delete(
  "/modules/:moduleId",
  validate(moduleIdParamSchema),
  asyncHandler(async (req, res) => {
    await prisma.courseModule.delete({ where: { id: req.validated.params.moduleId } });
    broadcastPlatformEvent("learning-content", "module.deleted", { moduleId: req.validated.params.moduleId });
    res.json({ success: true, message: "Module deleted" });
  }),
);

export default router;
