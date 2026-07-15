import { authCookieOptions } from "../../utils/jwt.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authService from "./auth.service.js";

const accessCookie = { ...authCookieOptions(), maxAge: 15 * 60 * 1000 };
const refreshCookie = { ...authCookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 };

function setAuthCookies(res, tokens) {
  res.cookie("accessToken", tokens.accessToken, accessCookie);
  res.cookie("refreshToken", tokens.refreshToken, refreshCookie);
}

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validated.body);
  setAuthCookies(res, result);
  res.json({ success: true, data: { user: result.user }, message: "Logged in" });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.cookies.refreshToken);
  setAuthCookies(res, result);
  res.json({ success: true, data: { user: result.user }, message: "Session refreshed" });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie("accessToken", authCookieOptions());
  res.clearCookie("refreshToken", authCookieOptions());
  res.json({ success: true, message: "Logged out" });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.json({ success: true, data: null });
  }
  const user = await authService.getCurrentUser(req.user.id);
  res.json({ success: true, data: user });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(
    req.user.id,
    req.validated.body.currentPassword,
    req.validated.body.newPassword,
  );
  res.json({ success: true, message: "Password changed" });
});
