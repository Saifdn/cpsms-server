import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { parsePhoneNumber } from "libphonenumber-js";
import User from "../models/User.js";
import Graduate from "../models/Graduate.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateTokens.js";
import { sendResetPasswordEmail } from "../utils/sendResetPasswordEmail.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.isOperational = true;
  return err;
}

function unauthorized(message) {
  const err = new Error(message);
  err.statusCode = 401;
  err.isOperational = true;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.statusCode = 403;
  err.isOperational = true;
  return err;
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export async function registerUser({ fullName, email, phone, password }) {
  if (!fullName || !email || !phone || !password) {
    throw badRequest("Please provide fullName, email, phone and password");
  }

  const parsedPhone = parsePhoneNumber(phone);
  if (!parsedPhone?.isValid()) {
    throw badRequest("Invalid phone number");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await Graduate.create({
    fullName,
    email,
    countryCode: parsedPhone.country,
    phone: parsedPhone.number,
    password: hashedPassword,
    role: "graduate",
  });

  return { id: user._id, fullName: user.fullName, email: user.email, role: user.role };
}

export async function loginUser(email, password) {
  if (!email || !password) {
    throw badRequest("Please provide email and password");
  }

  const user = await User.findOne({ email });
  if (!user) throw unauthorized("Invalid credentials");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw unauthorized("Invalid credentials");

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = {
    token: await bcrypt.hash(refreshToken, 10),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  await user.save();

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(token) {
  if (!token) throw unauthorized("No refresh token");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw forbidden("Invalid refresh token");
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.refreshToken?.token) throw forbidden("Invalid refresh token");

  const valid = await bcrypt.compare(token, user.refreshToken.token);
  if (!valid) throw forbidden("Invalid refresh token");

  return generateAccessToken(user);
}

export async function logoutUser(token) {
  if (!token) return; // idempotent — nothing to do

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return; // invalid token — clear cookie anyway (handled in controller)
  }

  const user = await User.findById(decoded.userId);
  if (user) {
    user.refreshToken = null;
    await user.save();
  }
}

export async function forgotPassword(email) {
  const GENERIC_MESSAGE = "If this email exists, a reset link has been sent";

  if (!email) throw badRequest("Please provide an email address");

  const user = await User.findOne({ email });
  if (!user) return GENERIC_MESSAGE; // prevents email enumeration

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.passwordResetToken = {
    token: hashedToken,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // Fire-and-forget — email failure must not block the response
  sendResetPasswordEmail({ email: user.email, fullName: user.fullName, resetUrl }).catch((err) =>
    console.error("sendResetPasswordEmail failed:", err)
  );

  return GENERIC_MESSAGE;
}

export async function resetPassword(token, password) {
  if (!token || !password) throw badRequest("Token and new password are required");

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    "passwordResetToken.token": hashedToken,
    "passwordResetToken.expiresAt": { $gt: Date.now() },
  });

  if (!user) throw badRequest("Token invalid or expired");

  user.password = await bcrypt.hash(password, 10);
  user.passwordResetToken = undefined;
  await user.save();
}
