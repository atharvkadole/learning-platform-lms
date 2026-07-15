import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { broadcastPlatformEvent } from "../events/eventBus.js";
import { recomputeModuleProgressForAssignedStudents } from "../progress/progress.service.js";
import { createMaterialSchema, idParamSchema, updateMaterialSchema } from "./material.validators.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const materials = await prisma.learningMaterial.findMany({
      where: req.query.moduleId ? { moduleId: req.query.moduleId } : {},
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });
    res.json({ success: true, data: materials });
  }),
);

router.post(
  "/",
  validate(createMaterialSchema),
  asyncHandler(async (req, res) => {
    const material = await prisma.$transaction(async (tx) => {
      const created = await tx.learningMaterial.create({ data: req.validated.body });
      await recomputeModuleProgressForAssignedStudents(created.moduleId, tx);
      return created;
    });
    broadcastPlatformEvent("learning-content", "material.created", {
      moduleId: material.moduleId,
      materialId: material.id,
    });
    res.status(201).json({ success: true, data: material, message: "Learning material created" });
  }),
);

router.patch(
  "/:id",
  validate(updateMaterialSchema),
  asyncHandler(async (req, res) => {
    const material = await prisma.$transaction(async (tx) => {
      const existing = await tx.learningMaterial.findUniqueOrThrow({ where: { id: req.validated.params.id } });
      const updated = await tx.learningMaterial.update({
        where: { id: req.validated.params.id },
        data: req.validated.body,
      });
      await recomputeModuleProgressForAssignedStudents(existing.moduleId, tx);
      if (updated.moduleId !== existing.moduleId) {
        await recomputeModuleProgressForAssignedStudents(updated.moduleId, tx);
      }
      return updated;
    });
    broadcastPlatformEvent("learning-content", "material.updated", {
      moduleId: material.moduleId,
      materialId: material.id,
    });
    res.json({ success: true, data: material, message: "Learning material updated" });
  }),
);

router.delete(
  "/:id",
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.learningMaterial.findUniqueOrThrow({ where: { id: req.validated.params.id } });
      await tx.learningMaterial.delete({ where: { id: req.validated.params.id } });
      await recomputeModuleProgressForAssignedStudents(existing.moduleId, tx);
      return existing;
    });
    broadcastPlatformEvent("learning-content", "material.deleted", {
      moduleId: deleted.moduleId,
      materialId: deleted.id,
    });
    res.json({ success: true, message: "Learning material deleted" });
  }),
);

export default router;
