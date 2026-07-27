import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

const THEORY_TYPES = new Set([
  "ARTICLE",
  "EXTERNAL_LINK",
  "GOOGLE_DRIVE",
  "IMAGE",
  "MARKDOWN",
  "ONEDRIVE",
  "PDF",
  "SLIDES",
  "VIDEO",
  "VIDEO_FILE",
  "YOUTUBE_VIDEO",
]);

const LAB_TYPES = new Set(["ATTACHMENT", "CODE_SNIPPET", "DROPBOX", "GITHUB_REPOSITORY", "INTERNAL_UPLOAD", "ZIP"]);
const PROJECT_PATTERN = /\b(project|capstone|portfolio|final build|final task|integration|deployment|bsp build|case study)\b/i;
const STATUS_WEIGHT = {
  NOT_STARTED: 0,
  IN_PROGRESS: 50,
  MASTERED: 100,
};

function compactSearch(value) {
  const search = String(value || "").trim();
  return search.length ? search : null;
}

function itemKey(studentId, entityId) {
  return `${studentId}:${entityId}`;
}

function displayName(user) {
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
}

function boundedPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Math.max(0, Math.min(100, Math.round(Number(value))));
}

function average(values) {
  const usable = values.filter((value) => value !== null && value !== undefined);
  if (!usable.length) return null;
  return boundedPercent(usable.reduce((sum, value) => sum + Number(value), 0) / usable.length);
}

function statusWeight(status) {
  return STATUS_WEIGHT[status] ?? 0;
}

function textForProjectMatch(module, material) {
  return [module.title, module.description, material?.title, material?.description].filter(Boolean).join(" ");
}

function isProjectItem(module, material) {
  return PROJECT_PATTERN.test(textForProjectMatch(module, material));
}

function flattenSubject(subject) {
  const modules = [];
  const materials = [];

  for (const phase of subject.phases || []) {
    for (const module of phase.modules || []) {
      modules.push({ ...module, phase });
      for (const material of module.learningMaterials || []) {
        materials.push({ module, material, phase });
      }
    }
  }

  return { modules, materials };
}

function materialMetric(studentId, items, materialStatuses) {
  if (!items.length) return { percent: null, total: 0, completed: 0, pending: 0 };

  const values = items.map(({ material }) => statusWeight(materialStatuses.get(itemKey(studentId, material.id))));
  const completed = values.filter((value) => value >= 100).length;

  return {
    percent: average(values),
    total: items.length,
    completed,
    pending: items.length - completed,
  };
}

function projectMetric(studentId, modules, materials, materialStatuses, moduleProgress) {
  const projectMaterials = materials.filter(({ module, material }) => isProjectItem(module, material));
  const projectModuleIds = new Set(
    modules.filter((module) => isProjectItem(module)).map((module) => module.id),
  );

  const values = projectMaterials.map(({ material }) => statusWeight(materialStatuses.get(itemKey(studentId, material.id))));

  for (const moduleId of projectModuleIds) {
    const moduleHasMaterial = projectMaterials.some(({ module }) => module.id === moduleId);
    if (!moduleHasMaterial) {
      values.push(moduleProgress.get(itemKey(studentId, moduleId))?.completionPercent ?? 0);
    }
  }

  if (!values.length) return { percent: null, total: 0, completed: 0, pending: 0 };

  const completed = values.filter((value) => Number(value) >= 100).length;
  return {
    percent: average(values),
    total: values.length,
    completed,
    pending: values.length - completed,
  };
}

function assignmentMetric(studentId, modules, moduleProgress, attemptsByModule) {
  const modulesWithAssessments = modules.filter((module) => module.assessment?.isPublished);
  if (!modulesWithAssessments.length) {
    return {
      percent: null,
      total: 0,
      completed: 0,
      pending: 0,
      latestScore: null,
      attempted: 0,
    };
  }

  const values = [];
  const scores = [];
  let attempted = 0;

  for (const module of modulesWithAssessments) {
    const progress = moduleProgress.get(itemKey(studentId, module.id));
    const attempts = attemptsByModule.get(itemKey(studentId, module.id)) || [];
    const graded = attempts.filter((attempt) => attempt.status === "GRADED");
    const bestGraded = [...graded].sort((left, right) => Number(right.score) - Number(left.score))[0];
    const latest = attempts[0];

    if (bestGraded) scores.push(Number(bestGraded.score) || 0);
    if (attempts.length) attempted += 1;

    if (progress?.assessmentPassed || graded.some((attempt) => attempt.passing)) {
      values.push(100);
    } else if (bestGraded) {
      values.push(boundedPercent(bestGraded.score) ?? 0);
    } else if (latest?.status === "SUBMITTED") {
      values.push(50);
    } else if (latest?.status === "IN_PROGRESS") {
      values.push(25);
    } else {
      values.push(0);
    }
  }

  const completed = values.filter((value) => Number(value) >= 100).length;
  return {
    percent: average(values),
    total: modulesWithAssessments.length,
    completed,
    pending: modulesWithAssessments.length - completed,
    latestScore: average(scores),
    attempted,
  };
}

function statusFromOverall(overallPercent, pendingActivities) {
  if (overallPercent >= 100 && pendingActivities === 0) return "MASTERED";
  if (overallPercent > 0) return "IN_PROGRESS";
  return "NOT_STARTED";
}

function buildReportRow(assignment, materialStatuses, moduleProgress, attemptsByModule) {
  const student = assignment.student;
  const subject = assignment.subject;
  const { modules, materials } = flattenSubject(subject);

  const projectItems = materials.filter(({ module, material }) => isProjectItem(module, material));
  const labItems = materials.filter(
    ({ module, material }) => !isProjectItem(module, material) && LAB_TYPES.has(material.type),
  );
  const theoryItems = materials.filter(
    ({ module, material }) => !isProjectItem(module, material) && !LAB_TYPES.has(material.type) && THEORY_TYPES.has(material.type),
  );

  const theory = materialMetric(student.id, theoryItems, materialStatuses);
  const lab = materialMetric(student.id, labItems, materialStatuses);
  const assignments = assignmentMetric(student.id, modules, moduleProgress, attemptsByModule);
  const projects = projectMetric(student.id, modules, materials, materialStatuses, moduleProgress);
  const overallPercent = average([theory.percent, lab.percent, assignments.percent, projects.percent]) ?? 0;
  const pendingActivities = theory.pending + lab.pending + assignments.pending + projects.pending;

  return {
    id: assignment.id,
    studentId: student.id,
    subjectId: subject.id,
    student: displayName(student.user),
    email: student.user.email,
    subject: subject.name,
    assignmentStatus: assignment.status,
    theoryPercent: theory.percent,
    theoryCompleted: theory.completed,
    theoryTotal: theory.total,
    labPercent: lab.percent,
    labCompleted: lab.completed,
    labTotal: lab.total,
    assignmentPercent: assignments.percent,
    assignmentsCompleted: assignments.completed,
    assignmentsTotal: assignments.total,
    assignmentsAttempted: assignments.attempted,
    projectPercent: projects.percent,
    projectsCompleted: projects.completed,
    projectsTotal: projects.total,
    overallPercent,
    latestScore: assignments.latestScore,
    pendingActivities,
    status: statusFromOverall(overallPercent, pendingActivities),
    modulesTotal: modules.length,
    materialsTotal: materials.length,
    projectItemsTotal: projectItems.length,
  };
}

function buildSummary(rows) {
  return {
    students: new Set(rows.map((row) => row.studentId)).size,
    subjects: new Set(rows.map((row) => row.subjectId)).size,
    rows: rows.length,
    averageTheory: average(rows.map((row) => row.theoryPercent)) ?? 0,
    averageLab: average(rows.map((row) => row.labPercent)) ?? 0,
    averageAssignments: average(rows.map((row) => row.assignmentPercent)) ?? 0,
    averageProjects: average(rows.map((row) => row.projectPercent)) ?? 0,
    averageOverall: average(rows.map((row) => row.overallPercent)) ?? 0,
    pendingActivities: rows.reduce((sum, row) => sum + row.pendingActivities, 0),
    atRisk: rows.filter((row) => row.overallPercent < 50 && row.pendingActivities > 0).length,
  };
}

function queryWhere(query) {
  const search = compactSearch(query.search);
  const subjectId = compactSearch(query.subjectId);
  const where = {};

  if (subjectId) where.subjectId = subjectId;
  if (search) {
    where.OR = [
      { student: { user: { firstName: { contains: search, mode: "insensitive" } } } },
      { student: { user: { lastName: { contains: search, mode: "insensitive" } } } },
      { student: { user: { email: { contains: search, mode: "insensitive" } } } },
      { subject: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  return where;
}

async function getStudentProgressReport(query = {}) {
  const [subjects, assignments] = await Promise.all([
    prisma.subject.findMany({
      select: { id: true, name: true, isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    prisma.studentSubject.findMany({
      where: queryWhere(query),
      include: {
        student: { include: { user: true } },
        subject: {
          include: {
            phases: {
              include: {
                modules: {
                  include: {
                    learningMaterials: { orderBy: { displayOrder: "asc" } },
                    assessment: true,
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
  ]);

  const studentIds = [...new Set(assignments.map((assignment) => assignment.studentId))];
  const subjectIds = [...new Set(assignments.map((assignment) => assignment.subjectId))];

  if (!assignments.length) {
    return { subjects, summary: buildSummary([]), rows: [] };
  }

  const [learningStatuses, progressRows, attempts] = await Promise.all([
    prisma.studentLearningStatus.findMany({
      where: {
        studentId: { in: studentIds },
        material: { module: { phase: { subjectId: { in: subjectIds } } } },
      },
    }),
    prisma.studentModuleProgress.findMany({
      where: {
        studentId: { in: studentIds },
        module: { phase: { subjectId: { in: subjectIds } } },
      },
    }),
    prisma.assessmentAttempt.findMany({
      where: {
        studentId: { in: studentIds },
        assessment: { module: { phase: { subjectId: { in: subjectIds } } } },
      },
      include: {
        assessment: {
          select: {
            moduleId: true,
          },
        },
      },
      orderBy: [{ startedAt: "desc" }],
    }),
  ]);

  const materialStatuses = new Map(
    learningStatuses.map((status) => [itemKey(status.studentId, status.materialId), status.status]),
  );
  const moduleProgress = new Map(progressRows.map((progress) => [itemKey(progress.studentId, progress.moduleId), progress]));
  const attemptsByModule = new Map();

  for (const attempt of attempts) {
    const key = itemKey(attempt.studentId, attempt.assessment.moduleId);
    const existing = attemptsByModule.get(key) || [];
    existing.push(attempt);
    attemptsByModule.set(key, existing);
  }

  const rows = assignments
    .map((assignment) => buildReportRow(assignment, materialStatuses, moduleProgress, attemptsByModule))
    .sort((left, right) => left.student.localeCompare(right.student) || left.subject.localeCompare(right.subject));

  return { subjects, summary: buildSummary(rows), rows };
}

function exportPercent(value) {
  return value === null || value === undefined ? "N/A" : `${Math.round(Number(value))}%`;
}

router.get(
  "/student-progress",
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: await getStudentProgressReport(req.query) });
  }),
);

router.get(
  "/student-progress.xlsx",
  asyncHandler(async (req, res) => {
    const report = await getStudentProgressReport(req.query);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Student Progress");
    sheet.columns = [
      { header: "Student", key: "student", width: 28 },
      { header: "Email", key: "email", width: 32 },
      { header: "Subject", key: "subject", width: 26 },
      { header: "Theory Completion", key: "theoryPercent", width: 20 },
      { header: "Lab Completion", key: "labPercent", width: 18 },
      { header: "Assignments", key: "assignmentPercent", width: 18 },
      { header: "Projects", key: "projectPercent", width: 18 },
      { header: "Overall", key: "overallPercent", width: 14 },
      { header: "Latest Score", key: "latestScore", width: 16 },
      { header: "Pending Activities", key: "pendingActivities", width: 20 },
      { header: "Status", key: "status", width: 16 },
    ];
    sheet.addRows(
      report.rows.map((row) => ({
        ...row,
        theoryPercent: exportPercent(row.theoryPercent),
        labPercent: exportPercent(row.labPercent),
        assignmentPercent: exportPercent(row.assignmentPercent),
        projectPercent: exportPercent(row.projectPercent),
        overallPercent: exportPercent(row.overallPercent),
        latestScore: exportPercent(row.latestScore),
      })),
    );
    sheet.getRow(1).font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=student-progress.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  }),
);

router.get(
  "/student-progress.pdf",
  asyncHandler(async (req, res) => {
    const report = await getStudentProgressReport(req.query);
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=student-progress.pdf");
    doc.pipe(res);
    doc.fontSize(16).text("Student Progress Report", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#475569").text(`Students: ${report.summary.students} | Subjects: ${report.summary.subjects} | Average overall: ${report.summary.averageOverall}%`);
    doc.moveDown();
    report.rows.forEach((row) => {
      doc.fontSize(10).fillColor("#0f172a").text(`${row.student} | ${row.subject}`);
      doc
        .fontSize(9)
        .fillColor("#475569")
        .text(
          `Theory: ${exportPercent(row.theoryPercent)} | Lab: ${exportPercent(row.labPercent)} | Assignments: ${exportPercent(row.assignmentPercent)} | Projects: ${exportPercent(row.projectPercent)} | Overall: ${exportPercent(row.overallPercent)} | Status: ${row.status}`,
        );
      doc.moveDown(0.5);
    });
    doc.end();
  }),
);

export default router;
