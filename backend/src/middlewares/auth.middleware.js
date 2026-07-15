import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/apiError.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function requireAuth(req, _res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;
    const token = req.cookies.accessToken || bearer;
    if (!token) throw new ApiError(401, "Authentication required");

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        studentProfile: { select: { id: true } },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new ApiError(401, "Inactive or missing user");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, "Invalid or expired token"));
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;
    const token = req.cookies.accessToken || bearer;
    if (!token) return next();

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        studentProfile: { select: { id: true } },
      },
    });

    if (user?.status === "ACTIVE") {
      req.user = user;
    }
    return next();
  } catch {
    return next();
  }
}
