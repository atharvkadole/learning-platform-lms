import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getPagination } from "../../utils/pagination.js";
import { broadcastPlatformEvent } from "../events/eventBus.js";
import { idParamSchema, subjectSchema, updateSubjectSchema } from "./subject.validators.js";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const where = req.query.search
      ? { name: { contains: req.query.search, mode: "insensitive" } }
      : {};
    const [total, subjects] = await Promise.all([
      prisma.subject.count({ where }),
      prisma.subject.findMany({
        where,
        include: { _count: { select: { phases: true, students: true } } },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);
    res.json({ success: true, data: subjects, meta: { page, limit, total } });
  }),
);

router.post(
  "/",
  validate(subjectSchema),
  asyncHandler(async (req, res) => {
    const subject = await prisma.subject.create({ data: req.validated.body });
    broadcastPlatformEvent("learning-content", "subject.created", { subjectId: subject.id });
    res.status(201).json({ success: true, data: subject, message: "Subject created" });
  }),
);

router.get(
  "/:id",
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const subject = await prisma.subject.findUniqueOrThrow({
      where: { id: req.validated.params.id },
      include: {
        phases: {
          orderBy: { displayOrder: "asc" },
          include: { modules: { orderBy: { displayOrder: "asc" } } },
        },
      },
    });
    res.json({ success: true, data: subject });
  }),
);

router.patch(
  "/:id",
  validate(updateSubjectSchema),
  asyncHandler(async (req, res) => {
    const subject = await prisma.subject.update({
      where: { id: req.validated.params.id },
      data: req.validated.body,
    });
    broadcastPlatformEvent("learning-content", "subject.updated", { subjectId: subject.id });
    res.json({ success: true, data: subject, message: "Subject updated" });
  }),
);

router.delete(
  "/:id",
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    await prisma.subject.delete({ where: { id: req.validated.params.id } });
    broadcastPlatformEvent("learning-content", "subject.deleted", { subjectId: req.validated.params.id });
    res.json({ success: true, message: "Subject deleted" });
  }),
);

export default router;
