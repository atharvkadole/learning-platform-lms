import { asyncHandler } from "../../utils/asyncHandler.js";
import { broadcastPlatformEvent } from "../events/eventBus.js";
import * as service from "./student.service.js";

export const list = asyncHandler(async (req, res) => {
  const result = await service.listStudents(req.query);
  res.json({ success: true, data: result.data, meta: result.meta });
});

export const create = asyncHandler(async (req, res) => {
  const student = await service.createStudent(req.validated.body);
  broadcastPlatformEvent("students", "student.created", { studentId: student.id });
  res.status(201).json({ success: true, data: student, message: "Student created" });
});

export const getById = asyncHandler(async (req, res) => {
  const student = await service.getStudent(req.validated.params.id);
  res.json({ success: true, data: student });
});

export const update = asyncHandler(async (req, res) => {
  const student = await service.updateStudent(req.validated.params.id, req.validated.body);
  broadcastPlatformEvent("students", "student.updated", { studentId: student.id });
  res.json({ success: true, data: student, message: "Student updated" });
});

export const remove = asyncHandler(async (req, res) => {
  await service.deleteStudent(req.validated.params.id);
  broadcastPlatformEvent("students", "student.deleted", { studentId: req.validated.params.id });
  res.json({ success: true, message: "Student deleted" });
});
