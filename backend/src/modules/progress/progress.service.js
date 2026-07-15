import { prisma } from "../../config/prisma.js";
import { calculateModuleCompletion, statusFromCompletion } from "../../utils/progress.js";

export async function recomputeModuleProgress(studentId, moduleId, tx = prisma) {
  const module = await tx.courseModule.findUniqueOrThrow({
    where: { id: moduleId },
    include: {
      learningMaterials: true,
      assessment: { include: { attempts: { where: { studentId }, orderBy: { score: "desc" } } } },
    },
  });

  const materialIds = module.learningMaterials.map((material) => material.id);
  const masteredCount = materialIds.length
    ? await tx.studentLearningStatus.count({
        where: { studentId, materialId: { in: materialIds }, status: "MASTERED" },
      })
    : 0;

  const bestAttempt = module.assessment?.attempts?.[0];
  const assessmentPassed = Boolean(bestAttempt?.passing);
  const completionPercent = calculateModuleCompletion({
    materialCount: module.learningMaterials.length,
    masteredCount,
    assessmentPassed,
  });

  return tx.studentModuleProgress.upsert({
    where: { studentId_moduleId: { studentId, moduleId } },
    update: {
      completionPercent,
      assessmentPassed,
      status: statusFromCompletion(completionPercent),
    },
    create: {
      studentId,
      moduleId,
      completionPercent,
      assessmentPassed,
      status: statusFromCompletion(completionPercent),
    },
  });
}

export async function recomputeModuleProgressForAssignedStudents(moduleId, tx = prisma) {
  const module = await tx.courseModule.findUniqueOrThrow({
    where: { id: moduleId },
    select: {
      phase: {
        select: {
          subject: {
            select: {
              students: {
                where: { status: "ACTIVE" },
                select: { studentId: true },
              },
            },
          },
        },
      },
    },
  });

  const studentIds = module.phase.subject.students.map((student) => student.studentId);
  await Promise.all(studentIds.map((studentId) => recomputeModuleProgress(studentId, moduleId, tx)));
}

export async function updateLearningStatus(studentId, materialId, status) {
  return prisma.$transaction(async (tx) => {
    const material = await tx.learningMaterial.findUniqueOrThrow({ where: { id: materialId } });
    const learningStatus = await tx.studentLearningStatus.upsert({
      where: { studentId_materialId: { studentId, materialId } },
      update: { status },
      create: { studentId, materialId, status },
    });
    await recomputeModuleProgress(studentId, material.moduleId, tx);
    return learningStatus;
  });
}
