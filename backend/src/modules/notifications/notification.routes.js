import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { z } from "zod";

const router = Router();
const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, data: notifications });
  }),
);

router.patch(
  "/:id/read",
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findFirstOrThrow({
      where: { id: req.validated.params.id, userId: req.user.id },
    });
    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
    res.json({ success: true, data: updated, message: "Notification marked as read" });
  }),
);

export default router;
