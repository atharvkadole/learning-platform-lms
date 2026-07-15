import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as service from "./progress.service.js";

const router = Router();

const statusSchema = z.object({
  body: z.object({
    materialId: z.string().min(1),
    status: z.enum(["NOT_STARTED", "IN_PROGRESS", "MASTERED"]),
  }),
});

router.use(requireAuth, requireRole("STUDENT"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await prisma.studentModuleProgress.findMany({
      where: { studentId: req.user.studentProfile.id },
      include: { module: { include: { phase: { include: { subject: true } } } } },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ success: true, data });
  }),
);

router.patch(
  "/learning-status",
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const data = await service.updateLearningStatus(
      req.user.studentProfile.id,
      req.validated.body.materialId,
      req.validated.body.status,
    );
    res.json({ success: true, data, message: "Learning status updated" });
  }),
);

export default router;
