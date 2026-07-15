import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/apiError.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";

const userSelect = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  studentProfile: { select: { id: true } },
};

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { studentProfile: { select: { id: true } } },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "Account is inactive");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  const safeUser = {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    studentProfile: user.studentProfile,
  };

  return {
    user: safeUser,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function refresh(token) {
  if (!token) throw new ApiError(401, "Refresh token is required");
  const payload = verifyRefreshToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: userSelect });
  if (!user || user.status !== "ACTIVE") throw new ApiError(401, "Invalid refresh token");
  return { user, accessToken: signAccessToken(user), refreshToken: signRefreshToken(user) };
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!user) throw new ApiError(404, "User not found");
  return user;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}
