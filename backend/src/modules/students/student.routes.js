import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import * as controller from "./student.controller.js";
import { createStudentSchema, idParamSchema, updateStudentSchema } from "./student.validators.js";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));
router.get("/", controller.list);
router.post("/", validate(createStudentSchema), controller.create);
router.get("/:id", validate(idParamSchema), controller.getById);
router.patch("/:id", validate(updateStudentSchema), controller.update);
router.delete("/:id", validate(idParamSchema), controller.remove);

export default router;
