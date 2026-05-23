import User from "../models/User.js"
import Graduate from "../models/Graduate.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateTokens.js"
import { sendResetPasswordEmail } from "../utils/sendResetPasswordEmail.js"

const cookieOptions = {
  httpOnly: true,
  secure: false, // true in production
  sameSite: "lax",
}

if (process.env.NODE_ENV === "production") {
  cookieOptions.secure = true,
  cookieOptions.sameSite = "none"
}

export const register = async (req, res) => {
  const { fullName, email, phone, password } = req.body
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await Graduate.create({
    fullName,
    email,
    phone,
    password: hashedPassword,
    role: 'graduate',
  })

  res.status(201).json({ message: "User created" })
}

export const login = async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ message: "Invalid credentials" })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ message: "Invalid credentials" })

  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)

  // Store single refresh token
  user.refreshToken = {
    token: await bcrypt.hash(refreshToken, 10),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // optional: 7 days expiry
  }
  await user.save()

  res.cookie("refreshToken", refreshToken, cookieOptions)
  res.json({ accessToken })
}

// export const refresh = async (req, res) => {
//   const token = req.cookies.refreshToken
//   if (!token) return res.sendStatus(401)

//   let decoded
//   try {
//     decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
//   } catch (err) {
//     return res.sendStatus(403)
//   }

//   const user = await User.findById(decoded.userId)
//   if (!user || !user.refreshToken?.token) return res.sendStatus(403)

//   const valid = await bcrypt.compare(token, user.refreshToken.token)
//   if (!valid) return res.sendStatus(403)

//   // Generate new tokens
//   const newAccessToken = generateAccessToken(user)
//   const newRefreshToken = generateRefreshToken(user)

//   user.refreshToken = {
//     token: await bcrypt.hash(newRefreshToken, 10),
//     createdAt: new Date(),
//     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
//   }
//   await user.save()

//   res.cookie("refreshToken", newRefreshToken, cookieOptions)
//   res.json({ accessToken: newAccessToken })
// }

export const refresh = async (req, res) => {
  const token = req.cookies.refreshToken
  if (!token) return res.sendStatus(401)

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
  } catch (err) {
    return res.sendStatus(403)
  }

  const user = await User.findById(decoded.userId)
  if (!user || !user.refreshToken?.token) return res.sendStatus(403)

  const valid = await bcrypt.compare(token, user.refreshToken.token)
  if (!valid) return res.sendStatus(403)

  // ✅ ONLY generate new access token
  const newAccessToken = generateAccessToken(user)

  res.json({ accessToken: newAccessToken })
}

export const logout = async (req, res) => {
  const token = req.cookies.refreshToken
  if (!token) return res.sendStatus(204)

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
  } catch (err) {
    return res.sendStatus(204)
  }

  const user = await User.findById(decoded.userId)
  if (user) {
    user.refreshToken = null
    await user.save()
  }

  res.clearCookie("refreshToken")
  res.sendStatus(204)
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.json({
      message: "If this email exists, a reset link has been sent",
    });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.passwordResetToken = {
    token: hashedToken,
    expiresAt: Date.now() + 10 * 60 * 1000,   // 10 minutes
  };

  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  await sendResetPasswordEmail({ email: user.email, fullName: user.fullName, resetUrl });

  res.json({ message: "Reset link sent" });
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    "passwordResetToken.token": hashedToken,
    "passwordResetToken.expiresAt": { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: "Token invalid or expired" });
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  user.password = hashedPassword;
  user.passwordResetToken = undefined;

  await user.save();

  res.json({ message: "Password reset successful" });
};