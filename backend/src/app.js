import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import studentRoutes from "./modules/students/student.routes.js";
import subjectRoutes from "./modules/subjects/subject.routes.js";
import learningPathRoutes from "./modules/learningPath/learningPath.routes.js";
import materialRoutes from "./modules/materials/material.routes.js";
import assessmentRoutes from "./modules/assessments/assessment.routes.js";
import progressRoutes from "./modules/progress/progress.routes.js";
import dashboardRoutes from "./modules/dashboards/dashboard.routes.js";
import reportRoutes from "./modules/reports/report.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import eventRoutes from "./modules/events/events.routes.js";

export const app = express();
const allowedOrigins = new Set(env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean));

app.use(pinoHttp());
app.use(helmet());
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers.accept?.includes("text/event-stream")) return false;
      return compression.filter(req, res);
    },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/", (_req, res) => {
  res.json({ success: true, message: "Student Learning API is running" });
});

app.get("/api/v1/health", (_req, res) => {
  res.json({ success: true, message: "OK" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin/students", studentRoutes);
app.use("/api/v1/admin/subjects", subjectRoutes);
app.use("/api/v1/admin/learning-path", learningPathRoutes);
app.use("/api/v1/admin/materials", materialRoutes);
app.use("/api/v1/admin/assessments", assessmentRoutes.admin);
app.use("/api/v1/admin/dashboard", dashboardRoutes.admin);
app.use("/api/v1/admin/reports", reportRoutes);
app.use("/api/v1/student/dashboard", dashboardRoutes.student);
app.use("/api/v1/student/progress", progressRoutes);
app.use("/api/v1/student/assessments", assessmentRoutes.student);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/events", eventRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
