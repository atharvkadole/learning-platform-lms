import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const admin = Router();
admin.use(requireAuth, requireRole("ADMIN"));

admin.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [totalStudents, activeStudents, subjects, assessments, progress, scores] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
      prisma.subject.count(),
      prisma.assessment.count(),
      prisma.studentModuleProgress.aggregate({ _avg: { completionPercent: true } }),
      prisma.assessmentAttempt.aggregate({ where: { status: "GRADED" }, _avg: { score: true } }),
    ]);
    res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        subjects,
        assessments,
        averageCompletion: progress._avg.completionPercent || 0,
        averageScore: scores._avg.score || 0,
      },
    });
  }),
);

const student = Router();
student.use(requireAuth, requireRole("STUDENT"));

student.get(
  "/",
  asyncHandler(async (req, res) => {
    const studentId = req.user.studentProfile.id;
    const [subjects, progress, attempts, notifications] = await Promise.all([
      prisma.studentSubject.findMany({
        where: { studentId, status: "ACTIVE", subject: { isActive: true } },
        include: {
          subject: {
            include: {
              phases: {
                include: {
                  modules: {
                    include: {
                      learningMaterials: {
                        orderBy: { displayOrder: "asc" },
                        include: {
                          statuses: {
                            where: { studentId },
                            select: { status: true, updatedAt: true },
                          },
                        },
                      },
                      assessment: {
                        include: {
                          _count: { select: { questions: true } },
                          attempts: {
                            where: { studentId },
                            orderBy: { startedAt: "desc" },
                            take: 3,
                          },
                        },
                      },
                      progress: {
                        where: { studentId },
                        take: 1,
                      },
                    },
                    orderBy: { displayOrder: "asc" },
                  },
                },
                orderBy: { displayOrder: "asc" },
              },
            },
          },
        },
      }),
      prisma.studentModuleProgress.findMany({
        where: { studentId },
        include: { module: { include: { phase: { include: { subject: true } } } } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.assessmentAttempt.findMany({
        where: { studentId, status: "GRADED" },
        orderBy: { submittedAt: "desc" },
        take: 5,
        include: { assessment: { include: { module: true } } },
      }),
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const averageProgress = progress.length
      ? progress.reduce((sum, item) => sum + item.completionPercent, 0) / progress.length
      : 0;
    const averageScore = attempts.length ? attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length : 0;

    res.json({
      success: true,
      data: {
        overallProgress: averageProgress,
        averageScore,
        subjects,
        recentProgress: progress.slice(0, 5),
        recentAttempts: attempts,
        notifications,
      },
    });
  }),
);

export default { admin, student };
