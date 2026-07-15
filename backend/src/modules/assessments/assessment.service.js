import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/apiError.js";
import { recomputeModuleProgress, recomputeModuleProgressForAssignedStudents } from "../progress/progress.service.js";

function normalizeString(value) {
  return String(value || "").trim().toLowerCase();
}

function sameSelection(a, b) {
  const left = [...a].sort();
  const right = [...b].sort();
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export async function createAssessment(input) {
  return prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.create({
      data: {
        moduleId: input.moduleId,
        title: input.title,
        description: input.description,
        durationMinutes: input.durationMinutes,
        passingPercent: input.passingPercent,
        negativeMarking: input.negativeMarking,
        shuffleQuestions: input.shuffleQuestions,
        shuffleOptions: input.shuffleOptions,
        attemptsAllowed: input.attemptsAllowed,
        showResult: input.showResult,
        showAnswers: input.showAnswers,
        isPublished: input.isPublished,
        questions: {
          create: input.questions.map((question) => ({
            text: question.text,
            type: question.type,
            difficulty: question.difficulty,
            points: question.points,
            correctTextAnswer: question.correctTextAnswer,
            displayOrder: question.displayOrder,
            options: { create: question.options },
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });
    await recomputeModuleProgressForAssignedStudents(input.moduleId, tx);
    return assessment;
  });
}

export async function listAdminAssessments() {
  return prisma.assessment.findMany({
    include: {
      module: { include: { phase: { include: { subject: true } } } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateAssessment(id, input) {
  const { questions, ...assessmentData } = input;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.assessment.findUniqueOrThrow({ where: { id }, select: { moduleId: true } });

    if (questions) {
      await tx.question.deleteMany({ where: { assessmentId: id } });
    }

    if (typeof assessmentData.passingPercent === "number") {
      await tx.assessmentAttempt.updateMany({
        where: { assessmentId: id, status: "GRADED", score: { gte: assessmentData.passingPercent } },
        data: { passing: true },
      });
      await tx.assessmentAttempt.updateMany({
        where: { assessmentId: id, status: "GRADED", score: { lt: assessmentData.passingPercent } },
        data: { passing: false },
      });
    }

    const assessment = await tx.assessment.update({
      where: { id },
      data: {
        ...assessmentData,
        ...(questions
          ? {
              questions: {
                create: questions.map((question) => ({
                  text: question.text,
                  type: question.type,
                  difficulty: question.difficulty,
                  points: question.points,
                  correctTextAnswer: question.correctTextAnswer,
                  displayOrder: question.displayOrder,
                  options: { create: question.options },
                })),
              },
            }
          : {}),
      },
      include: { questions: { include: { options: true } } },
    });
    await recomputeModuleProgressForAssignedStudents(existing.moduleId, tx);
    return assessment;
  });
}

export async function getStudentAssessments(studentId) {
  const assignedSubjects = await prisma.studentSubject.findMany({
    where: { studentId, status: "ACTIVE" },
    select: { subjectId: true },
  });
  const subjectIds = assignedSubjects.map((item) => item.subjectId);
  return prisma.assessment.findMany({
    where: {
      isPublished: true,
      module: { phase: { subjectId: { in: subjectIds }, subject: { isActive: true } } },
    },
    include: {
      module: { include: { phase: { include: { subject: true } } } },
      _count: { select: { questions: true } },
      attempts: {
        where: { studentId },
        orderBy: { startedAt: "desc" },
        take: 3,
      },
    },
  });
}

export async function startAttempt(studentId, assessmentId) {
  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: {
      attempts: { where: { studentId }, orderBy: { startedAt: "desc" } },
      module: {
        select: {
          phase: {
            select: {
              subject: {
                select: {
                  students: { where: { studentId, status: "ACTIVE" }, select: { studentId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!assessment.isPublished) throw new ApiError(403, "Assessment is not published");
  if (!assessment.module.phase.subject.students.length) throw new ApiError(403, "Assessment is not assigned to you");

  const existingAttempt = assessment.attempts.find((attempt) => attempt.status === "IN_PROGRESS");
  if (existingAttempt) {
    return prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id: existingAttempt.id },
      include: {
        assessment: {
          include: {
            questions: {
              orderBy: { displayOrder: "asc" },
              include: { options: { select: { id: true, text: true } } },
            },
          },
        },
      },
    });
  }

  if (assessment.attempts.length >= assessment.attemptsAllowed) {
    throw new ApiError(403, "Attempts limit reached");
  }

  return prisma.assessmentAttempt.create({
    data: { assessmentId, studentId },
    include: {
      assessment: {
        include: {
          questions: {
            orderBy: { displayOrder: "asc" },
            include: { options: { select: { id: true, text: true } } },
          },
        },
      },
    },
  });
}

export async function submitAttempt(studentId, attemptId, answers) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.assessmentAttempt.findFirstOrThrow({
      where: { id: attemptId, studentId, status: "IN_PROGRESS" },
      include: {
        assessment: {
          include: {
            questions: {
              include: { options: true },
            },
          },
        },
      },
    });

    let score = 0;
    const maxScore = attempt.assessment.questions.reduce((sum, question) => sum + question.points, 0);
    const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

    for (const question of attempt.assessment.questions) {
      const submitted = answerByQuestion.get(question.id) || {};
      let isCorrect = null;
      let answerScore = 0;

      if (["MCQ", "MULTIPLE_ANSWER", "TRUE_FALSE"].includes(question.type)) {
        const correctIds = question.options.filter((option) => option.isCorrect).map((option) => option.id);
        isCorrect = sameSelection(submitted.selectedOptionIds || [], correctIds);
        answerScore = isCorrect ? question.points : 0;
      } else if (question.type === "FILL_IN_BLANK") {
        isCorrect = normalizeString(submitted.textAnswer) === normalizeString(question.correctTextAnswer);
        answerScore = isCorrect ? question.points : 0;
      }

      score += answerScore;
      await tx.assessmentAnswer.create({
        data: {
          attemptId,
          questionId: question.id,
          selectedOptionIds: submitted.selectedOptionIds || [],
          textAnswer: submitted.textAnswer,
          isCorrect,
          score: answerScore,
        },
      });
    }

    const percentage = maxScore ? (score / maxScore) * 100 : 0;
    const passing = percentage >= attempt.assessment.passingPercent;
    const submittedAt = new Date();

    const updated = await tx.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        submittedAt,
        timeTakenSeconds: Math.round((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000),
        score: percentage,
        passing,
        status: "GRADED",
      },
      include: { answers: true, assessment: true },
    });

    await recomputeModuleProgress(studentId, attempt.assessment.moduleId, tx);
    return updated;
  });
}
