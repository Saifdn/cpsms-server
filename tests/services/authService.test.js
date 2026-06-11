import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import crypto from "crypto";

jest.mock("../../src/models/Graduate.js", () => ({
  __esModule: true,
  default: { create: jest.fn(), findById: jest.fn(), findOne: jest.fn() },
}));
jest.mock("../../src/models/User.js", () => ({
  __esModule: true,
  default: { create: jest.fn(), findById: jest.fn(), findOne: jest.fn() },
}));
jest.mock("../../src/utils/sendResetPasswordEmail.js", () => ({
  __esModule: true,
  sendResetPasswordEmail: jest.fn(),
}));
jest.mock("../../src/utils/generateTokens.js", () => ({
  __esModule: true,
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  generateResetPasswordToken: jest.fn(),
}));

import Graduate from "../../src/models/Graduate.js";
import User from "../../src/models/User.js";
import { sendResetPasswordEmail } from "../../src/utils/sendResetPasswordEmail.js";
import { generateAccessToken, generateRefreshToken } from "../../src/utils/generateTokens.js";

import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
} from "../../src/services/authService.js";

import bcrypt from "bcrypt";
import { makeUser } from "../helpers/mockFactory.js";

const VALID_INPUT = {
  fullName: "Ahmad Saifudin",
  email: "ahmad@test.com",
  phone: "+60123456789",
  password: "Password123!",
};

// ─────────────────────────────────────────────────────────────────────────────
// registerUser
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] registerUser — input validation branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when fullName is missing", async () => {
    const { fullName: _o, ...input } = VALID_INPUT;
    await expect(registerUser(input)).rejects.toMatchObject({ statusCode: 400 });
    expect(Graduate.create).not.toHaveBeenCalled();
  });

  it("throws 400 when email is missing", async () => {
    const { email: _o, ...input } = VALID_INPUT;
    await expect(registerUser(input)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when phone is missing", async () => {
    const { phone: _o, ...input } = VALID_INPUT;
    await expect(registerUser(input)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when password is missing", async () => {
    const { password: _o, ...input } = VALID_INPUT;
    await expect(registerUser(input)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 for phone number with no country code (ParseError branch)", async () => {
    await expect(registerUser({ ...VALID_INPUT, phone: "12345" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Invalid phone number" });
    expect(Graduate.create).not.toHaveBeenCalled();
  });

  it("throws 400 for phone number that is too short to be valid (isValid() branch)", async () => {
    await expect(registerUser({ ...VALID_INPUT, phone: "+19999" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Invalid phone number" });
    expect(Graduate.create).not.toHaveBeenCalled();
  });
});

describe("[DataFlow] registerUser — password hashing and field normalization", () => {
  beforeEach(() => jest.clearAllMocks());

  it("transforms plaintext password → bcrypt hash before storing (password is never saved as plaintext)", async () => {
    Graduate.create.mockResolvedValue({ _id: "id1", fullName: "Ahmad Saifudin", email: "ahmad@test.com", role: "graduate" });

    await registerUser(VALID_INPUT);

    const stored = Graduate.create.mock.calls[0][0].password;
    expect(stored).not.toBe(VALID_INPUT.password);
    expect(await bcrypt.compare(VALID_INPUT.password, stored)).toBe(true);
  });

  it("hardcodes role to 'graduate' — caller input cannot override it", async () => {
    Graduate.create.mockResolvedValue({ _id: "id1", fullName: "X", email: "x@x.com", role: "graduate" });
    await registerUser(VALID_INPUT);
    expect(Graduate.create.mock.calls[0][0].role).toBe("graduate");
  });

  it("strips password and refreshToken from the returned object (sensitive fields killed at output)", async () => {
    Graduate.create.mockResolvedValue({ _id: "id1", fullName: "Ahmad Saifudin", email: "ahmad@test.com", role: "graduate" });

    const result = await registerUser(VALID_INPUT);
    expect(result).toEqual({ id: "id1", fullName: "Ahmad Saifudin", email: "ahmad@test.com", role: "graduate" });
    expect(result.password).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loginUser
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] loginUser — validation and authentication branches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateAccessToken.mockReturnValue("mock-access-token");
    generateRefreshToken.mockReturnValue("mock-refresh-token");
  });

  it("throws 400 when email is missing", async () => {
    await expect(loginUser(null, "password")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when password is missing", async () => {
    await expect(loginUser("test@test.com", null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 401 when user not found in DB (user === null branch)", async () => {
    User.findOne.mockResolvedValue(null);
    await expect(loginUser("ghost@test.com", "password"))
      .rejects.toMatchObject({ statusCode: 401, message: "Invalid credentials" });
  });

  it("throws 401 when password does not match stored hash (!valid branch)", async () => {
    const hash = await bcrypt.hash("correct-password", 1);
    User.findOne.mockResolvedValue(makeUser({ password: hash }));
    await expect(loginUser("test@test.com", "wrong-password"))
      .rejects.toMatchObject({ statusCode: 401, message: "Invalid credentials" });
  });
});

describe("[DataFlow] loginUser — token generation and refresh token storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateAccessToken.mockReturnValue("mock-access-token");
    generateRefreshToken.mockReturnValue("mock-refresh-token");
  });

  it("raw refreshToken → bcrypt hash → stored on user (token is never stored as plaintext)", async () => {
    const hash = await bcrypt.hash("Password123!", 1);
    const user = makeUser({ password: hash });
    User.findOne.mockResolvedValue(user);
    generateRefreshToken.mockReturnValue("raw-refresh-token");

    await loginUser("test@test.com", "Password123!");

    expect(user.refreshToken.token).not.toBe("raw-refresh-token");
    expect(await bcrypt.compare("raw-refresh-token", user.refreshToken.token)).toBe(true);
  });

  it("expiresAt is computed as Date.now() + 7 days from login time", async () => {
    const hash = await bcrypt.hash("Password123!", 1);
    const user = makeUser({ password: hash });
    User.findOne.mockResolvedValue(user);

    await loginUser("test@test.com", "Password123!");

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const diff = user.refreshToken.expiresAt.getTime() - Date.now();
    expect(diff).toBeGreaterThan(sevenDaysMs - 5000);
    expect(diff).toBeLessThan(sevenDaysMs + 5000);
  });

  it("returns tokens on successful login path", async () => {
    const hash = await bcrypt.hash("Password123!", 1);
    User.findOne.mockResolvedValue(makeUser({ password: hash }));

    const result = await loginUser("test@test.com", "Password123!");
    expect(result).toEqual({ accessToken: "mock-access-token", refreshToken: "mock-refresh-token" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshAccessToken
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] refreshAccessToken — token verification branches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateAccessToken.mockReturnValue("new-access-token");
  });

  it("throws 401 when no token provided (!token branch)", async () => {
    await expect(refreshAccessToken(null)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("throws 403 when token has wrong signature (jwt.verify catch branch)", async () => {
    const jwt = require("jsonwebtoken");
    const badToken = jwt.sign({ userId: "u1" }, "wrong-secret");
    await expect(refreshAccessToken(badToken)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("throws 403 when user no longer exists in DB (!user branch)", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ userId: "u1" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    User.findById.mockResolvedValue(null);
    await expect(refreshAccessToken(token)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("throws 403 when stored hash does not match the presented token (!valid branch)", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ userId: "u1" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    const hash = await bcrypt.hash("different-token", 1);
    User.findById.mockResolvedValue(makeUser({ refreshToken: { token: hash } }));
    await expect(refreshAccessToken(token)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns a new access token when all checks pass (success branch)", async () => {
    const jwt = require("jsonwebtoken");
    const rawToken = jwt.sign({ userId: "u1" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    const hash = await bcrypt.hash(rawToken, 1);
    User.findById.mockResolvedValue(makeUser({ refreshToken: { token: hash } }));

    expect(await refreshAccessToken(rawToken)).toBe("new-access-token");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// forgotPassword
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] forgotPassword — user lookup and email dispatch branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when email is missing (!email branch)", async () => {
    await expect(forgotPassword(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns generic message when user not found — prevents email enumeration (!user early return)", async () => {
    User.findOne.mockResolvedValue(null);
    const result = await forgotPassword("ghost@test.com");
    expect(result).toBe("If this email exists, a reset link has been sent");
    expect(sendResetPasswordEmail).not.toHaveBeenCalled();
  });

  it("does not throw when email send fails — fire-and-forget catch branch", async () => {
    User.findOne.mockResolvedValue(makeUser());
    sendResetPasswordEmail.mockRejectedValue(new Error("smtp error"));
    await expect(forgotPassword("user@test.com")).resolves.toBe("If this email exists, a reset link has been sent");
  });
});

describe("[DataFlow] forgotPassword — reset token generation and expiry calculation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stores SHA256 hash of raw token — raw token is never saved to DB", async () => {
    const user = makeUser();
    User.findOne.mockResolvedValue(user);
    sendResetPasswordEmail.mockResolvedValue(true);

    await forgotPassword("user@test.com");

    const storedHash = user.passwordResetToken.token;
    expect(storedHash).toHaveLength(64);
    // The email receives a reset URL with the raw token; the DB stores only the hash
    const emailArg = sendResetPasswordEmail.mock.calls[0][0];
    const rawToken = emailArg.resetUrl.split("/").pop();
    const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    expect(storedHash).toBe(expectedHash);
  });

  it("expiresAt is computed as Date.now() + 10 minutes", async () => {
    const user = makeUser();
    User.findOne.mockResolvedValue(user);
    sendResetPasswordEmail.mockResolvedValue(true);

    await forgotPassword("user@test.com");

    const tenMinMs = 10 * 60 * 1000;
    const diff = user.passwordResetToken.expiresAt - Date.now();
    expect(diff).toBeGreaterThan(tenMinMs - 5000);
    expect(diff).toBeLessThan(tenMinMs + 5000);
  });

  it("reset URL embeds CLIENT_URL and raw reset token (not the hash)", async () => {
    const user = makeUser();
    User.findOne.mockResolvedValue(user);
    sendResetPasswordEmail.mockResolvedValue(true);

    await forgotPassword("user@test.com");

    const { resetUrl } = sendResetPasswordEmail.mock.calls[0][0];
    expect(resetUrl).toContain(process.env.CLIENT_URL);
    expect(resetUrl).toContain("/reset-password/");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resetPassword
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] resetPassword — token validation branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when token is missing (!token branch)", async () => {
    await expect(resetPassword(null, "newpassword")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when password is missing (!password branch)", async () => {
    await expect(resetPassword("sometoken", null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when token is expired or invalid — User.findOne returns null (!user branch)", async () => {
    User.findOne.mockResolvedValue(null);
    await expect(resetPassword("expired-token", "newpassword"))
      .rejects.toMatchObject({ statusCode: 400, message: "Token invalid or expired" });
  });
});

describe("[DataFlow] resetPassword — password replacement and token cleanup", () => {
  beforeEach(() => jest.clearAllMocks());

  it("new password → bcrypt hash → replaces old password (data transformation)", async () => {
    const user = makeUser({ passwordResetToken: { token: "hashed", expiresAt: Date.now() + 60000 } });
    User.findOne.mockResolvedValue(user);

    await resetPassword("valid-raw-token", "NewPassword123!");

    expect(user.password).not.toBe("NewPassword123!");
    expect(await bcrypt.compare("NewPassword123!", user.password)).toBe(true);
  });

  it("passwordResetToken field is set to undefined (killed) after successful reset", async () => {
    const user = makeUser({ passwordResetToken: { token: "hashed", expiresAt: Date.now() + 60000 } });
    User.findOne.mockResolvedValue(user);

    await resetPassword("valid-raw-token", "NewPassword123!");

    expect(user.passwordResetToken).toBeUndefined();
    expect(user.save).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// logoutUser
// ─────────────────────────────────────────────────────────────────────────────

describe("[Path] logoutUser — complete execution paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Path 1 — no token: returns immediately without hitting DB", async () => {
    await expect(logoutUser(null)).resolves.toBeUndefined();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("Path 2 — invalid JWT: returns without error (idempotent)", async () => {
    await expect(logoutUser("not-a-jwt")).resolves.toBeUndefined();
  });

  it("Path 3 — valid token, user found: clears refreshToken and saves", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ userId: "u1" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    const user = makeUser({ refreshToken: { token: "some-hash" } });
    User.findById.mockResolvedValue(user);

    await logoutUser(token);

    expect(user.refreshToken).toBeNull();
    expect(user.save).toHaveBeenCalledTimes(1);
  });
});
