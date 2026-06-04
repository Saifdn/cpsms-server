import { jest, describe, it, expect, beforeEach } from "@jest/globals";

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

describe("registerUser", () => {
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

  it("throws 400 for invalid phone number (no country code)", async () => {
    await expect(registerUser({ ...VALID_INPUT, phone: "12345" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Invalid phone number" });
    expect(Graduate.create).not.toHaveBeenCalled();
  });

  it("throws 400 for phone number that is too short to be valid", async () => {
    // +1 (US country code) but too few digits to be valid
    await expect(registerUser({ ...VALID_INPUT, phone: "+19999" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Invalid phone number" });
    expect(Graduate.create).not.toHaveBeenCalled();
  });

  it("hashes password before passing to Graduate.create", async () => {
    Graduate.create.mockResolvedValue({
      _id: "id1",
      fullName: "Ahmad Saifudin",
      email: "ahmad@test.com",
      role: "graduate",
    });

    await registerUser(VALID_INPUT);

    const callArg = Graduate.create.mock.calls[0][0];
    expect(callArg.password).not.toBe(VALID_INPUT.password);
    const isHashed = await bcrypt.compare(VALID_INPUT.password, callArg.password);
    expect(isHashed).toBe(true);
  });

  it("always sets role to 'graduate' regardless of caller input", async () => {
    Graduate.create.mockResolvedValue({ _id: "id1", fullName: "X", email: "x@x.com", role: "graduate" });
    await registerUser(VALID_INPUT);
    expect(Graduate.create.mock.calls[0][0].role).toBe("graduate");
  });

  it("returns only safe fields — no password in response", async () => {
    Graduate.create.mockResolvedValue({
      _id: "id1",
      fullName: "Ahmad Saifudin",
      email: "ahmad@test.com",
      role: "graduate",
    });

    const result = await registerUser(VALID_INPUT);
    expect(result).toEqual({ id: "id1", fullName: "Ahmad Saifudin", email: "ahmad@test.com", role: "graduate" });
    expect(result.password).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
  });
});

describe("loginUser", () => {
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

  it("throws 401 when user not found", async () => {
    User.findOne.mockResolvedValue(null);
    await expect(loginUser("ghost@test.com", "password"))
      .rejects.toMatchObject({ statusCode: 401, message: "Invalid credentials" });
  });

  it("throws 401 when password is incorrect", async () => {
    const hash = await bcrypt.hash("correct-password", 1);
    User.findOne.mockResolvedValue(makeUser({ password: hash }));
    await expect(loginUser("test@test.com", "wrong-password"))
      .rejects.toMatchObject({ statusCode: 401, message: "Invalid credentials" });
  });

  it("returns accessToken and refreshToken on successful login", async () => {
    const hash = await bcrypt.hash("Password123!", 1);
    User.findOne.mockResolvedValue(makeUser({ password: hash }));

    const result = await loginUser("test@test.com", "Password123!");
    expect(result).toEqual({ accessToken: "mock-access-token", refreshToken: "mock-refresh-token" });
  });

  it("saves the user with a hashed refreshToken — not the raw token", async () => {
    const hash = await bcrypt.hash("Password123!", 1);
    const user = makeUser({ password: hash });
    User.findOne.mockResolvedValue(user);
    generateRefreshToken.mockReturnValue("raw-refresh-token");

    await loginUser("test@test.com", "Password123!");

    expect(user.save).toHaveBeenCalledTimes(1);
    expect(user.refreshToken.token).not.toBe("raw-refresh-token");
    const valid = await bcrypt.compare("raw-refresh-token", user.refreshToken.token);
    expect(valid).toBe(true);
  });

  it("sets refreshToken.expiresAt approximately 7 days from now", async () => {
    const hash = await bcrypt.hash("Password123!", 1);
    const user = makeUser({ password: hash });
    User.findOne.mockResolvedValue(user);

    await loginUser("test@test.com", "Password123!");

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const diff = user.refreshToken.expiresAt.getTime() - Date.now();
    expect(diff).toBeGreaterThan(sevenDaysMs - 5000);
    expect(diff).toBeLessThan(sevenDaysMs + 5000);
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateAccessToken.mockReturnValue("new-access-token");
  });

  it("throws 401 when no token provided", async () => {
    await expect(refreshAccessToken(null)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("throws 403 when token has wrong signature", async () => {
    const jwt = require("jsonwebtoken");
    const badToken = jwt.sign({ userId: "u1" }, "wrong-secret");
    await expect(refreshAccessToken(badToken)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("throws 403 when user not found in DB", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ userId: "u1" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    User.findById.mockResolvedValue(null);
    await expect(refreshAccessToken(token)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("throws 403 when stored hash does not match the token", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ userId: "u1" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    const hash = await bcrypt.hash("different-token", 1);
    User.findById.mockResolvedValue(makeUser({ refreshToken: { token: hash } }));
    await expect(refreshAccessToken(token)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns a new access token on success", async () => {
    const jwt = require("jsonwebtoken");
    const rawToken = jwt.sign({ userId: "u1" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    const hash = await bcrypt.hash(rawToken, 1);
    User.findById.mockResolvedValue(makeUser({ refreshToken: { token: hash } }));

    const result = await refreshAccessToken(rawToken);
    expect(result).toBe("new-access-token");
  });
});

describe("forgotPassword", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when email is missing", async () => {
    await expect(forgotPassword(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns generic message when user not found (prevents email enumeration)", async () => {
    User.findOne.mockResolvedValue(null);
    const result = await forgotPassword("ghost@test.com");
    expect(result).toBe("If this email exists, a reset link has been sent");
    expect(sendResetPasswordEmail).not.toHaveBeenCalled();
  });

  it("saves hashed reset token and fires email when user exists", async () => {
    const user = makeUser();
    User.findOne.mockResolvedValue(user);
    sendResetPasswordEmail.mockResolvedValue(true);

    const result = await forgotPassword("user@test.com");

    expect(result).toBe("If this email exists, a reset link has been sent");
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(user.passwordResetToken).toBeDefined();
    expect(user.passwordResetToken.token).toHaveLength(64);
    expect(sendResetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: user.email, resetUrl: expect.stringContaining(process.env.CLIENT_URL) })
    );
  });

  it("does not throw when sendResetPasswordEmail rejects", async () => {
    const user = makeUser();
    User.findOne.mockResolvedValue(user);
    sendResetPasswordEmail.mockRejectedValue(new Error("smtp error"));

    await expect(forgotPassword("user@test.com")).resolves.toBe(
      "If this email exists, a reset link has been sent"
    );
  });

  it("reset token expiresAt is ~10 minutes from now", async () => {
    const user = makeUser();
    User.findOne.mockResolvedValue(user);
    sendResetPasswordEmail.mockResolvedValue(true);

    await forgotPassword("user@test.com");

    const tenMinMs = 10 * 60 * 1000;
    const diff = user.passwordResetToken.expiresAt - Date.now();
    expect(diff).toBeGreaterThan(tenMinMs - 5000);
    expect(diff).toBeLessThan(tenMinMs + 5000);
  });
});

describe("resetPassword", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when token is missing", async () => {
    await expect(resetPassword(null, "newpassword")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when password is missing", async () => {
    await expect(resetPassword("sometoken", null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when token is expired or invalid (user not found)", async () => {
    User.findOne.mockResolvedValue(null);
    await expect(resetPassword("expired-token", "newpassword"))
      .rejects.toMatchObject({ statusCode: 400, message: "Token invalid or expired" });
  });

  it("hashes new password, clears resetToken, and saves on success", async () => {
    const user = makeUser({ passwordResetToken: { token: "hashed", expiresAt: Date.now() + 60000 } });
    User.findOne.mockResolvedValue(user);

    await resetPassword("valid-raw-token", "NewPassword123!");

    expect(user.password).not.toBe("NewPassword123!");
    const isHashed = await bcrypt.compare("NewPassword123!", user.password);
    expect(isHashed).toBe(true);
    expect(user.passwordResetToken).toBeUndefined();
    expect(user.save).toHaveBeenCalledTimes(1);
  });
});

describe("logoutUser", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does nothing when no token provided", async () => {
    await expect(logoutUser(null)).resolves.toBeUndefined();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("returns without error when token is invalid JWT", async () => {
    await expect(logoutUser("not-a-jwt")).resolves.toBeUndefined();
  });

  it("clears refreshToken on user when token is valid", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ userId: "u1" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    const user = makeUser({ refreshToken: { token: "some-hash" } });
    User.findById.mockResolvedValue(user);

    await logoutUser(token);

    expect(user.refreshToken).toBeNull();
    expect(user.save).toHaveBeenCalledTimes(1);
  });
});
