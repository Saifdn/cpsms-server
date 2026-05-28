import * as authService from "../services/authService.js";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
});

export const register = async (req, res, next) => {
  try {
    const data = await authService.registerUser(req.body);
    res.status(201).json({ success: true, message: "Account created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = await authService.loginUser(req.body.email, req.body.password);
    res.cookie("refreshToken", refreshToken, getCookieOptions());
    res.json({ success: true, accessToken });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const accessToken = await authService.refreshAccessToken(req.cookies.refreshToken);
    res.json({ success: true, accessToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logoutUser(req.cookies.refreshToken);
    res.clearCookie("refreshToken", getCookieOptions());
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const message = await authService.forgotPassword(req.body.email);
    res.json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.params.token, req.body.password);
    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
};
