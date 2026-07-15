import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import * as controller from "./auth.controller.js";
import { changePasswordSchema, loginSchema } from "./auth.validators.js";

const router = Router();

router.post("/login", validate(loginSchema), controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", optionalAuth, controller.me);
router.patch("/change-password", requireAuth, validate(changePasswordSchema), controller.changePassword);

export default router;
