import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

async function getProgressRows() {
  const progress = await prisma.studentModuleProgress.findMany({
    include: {
      student: { include: { user: true } },
      module: { include: { phase: { include: { subject: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return progress.map((item) => ({
    student: `${item.student.user.firstName} ${item.student.user.lastName}`,
    email: item.student.user.email,
    subject: item.module.phase.subject.name,
    phase: item.module.phase.title,
    module: item.module.title,
    completion: item.completionPercent,
    status: item.status,
    assessmentPassed: item.assessmentPassed ? "Yes" : "No",
  }));
}

router.get(
  "/student-progress.xlsx",
  asyncHandler(async (_req, res) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Student Progress");
    sheet.columns = [
      { header: "Student", key: "student", width: 28 },
      { header: "Email", key: "email", width: 32 },
      { header: "Subject", key: "subject", width: 22 },
      { header: "Phase", key: "phase", width: 24 },
      { header: "Module", key: "module", width: 28 },
      { header: "Completion %", key: "completion", width: 16 },
      { header: "Status", key: "status", width: 16 },
      { header: "Assessment Passed", key: "assessmentPassed", width: 20 },
    ];
    sheet.addRows(await getProgressRows());
    sheet.getRow(1).font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=student-progress.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  }),
);

router.get(
  "/student-progress.pdf",
  asyncHandler(async (_req, res) => {
    const rows = await getProgressRows();
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=student-progress.pdf");
    doc.pipe(res);
    doc.fontSize(16).text("Student Progress Report", { underline: true });
    doc.moveDown();
    rows.forEach((row) => {
      doc.fontSize(10).text(`${row.student} | ${row.subject} > ${row.phase} > ${row.module}`);
      doc.text(`Completion: ${row.completion}% | Status: ${row.status} | Passed: ${row.assessmentPassed}`);
      doc.moveDown(0.5);
    });
    doc.end();
  }),
);

export default router;
