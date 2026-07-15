import { env } from "../config/env.js";

export function errorMiddleware(err, _req, res, _next) {
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists",
      errors: err.meta,
    });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ success: false, message: "Record not found" });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    errors: err.details,
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  });
}
