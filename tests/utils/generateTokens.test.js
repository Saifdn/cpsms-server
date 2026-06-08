import { describe, it, expect } from "@jest/globals";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken, generateResetPasswordToken } from "../../src/utils/generateTokens.js";

const fakeUser = {
  _id: "64f0000000000000000000a1",
  role: "graduate",
  fullName: "Test User",
  email: "test@test.com",
};

// ─────────────────────────────────────────────────────────────────────────────
// generateAccessToken — Data Flow Testing
// (user object fields → JWT payload → signed token → verifiable with correct secret)
// ─────────────────────────────────────────────────────────────────────────────

describe("[DataFlow] generateAccessToken — user fields to JWT payload", () => {
  it("user._id → payload.userId (field mapping into token)", () => {
    const decoded = jwt.decode(generateAccessToken(fakeUser));
    expect(decoded.userId).toBe(fakeUser._id);
  });

  it("user.role, fullName, email are all embedded in the token payload", () => {
    const decoded = jwt.decode(generateAccessToken(fakeUser));
    expect(decoded.role).toBe(fakeUser.role);
    expect(decoded.fullName).toBe(fakeUser.fullName);
    expect(decoded.email).toBe(fakeUser.email);
  });

  it("token has an expiry derived from ACCESS_TOKEN_EXPIRY env var (exp > iat)", () => {
    const decoded = jwt.decode(generateAccessToken(fakeUser));
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});

describe("[Branch] generateAccessToken — secret isolation branches", () => {
  it("verifiable with JWT_ACCESS_SECRET (correct secret branch)", () => {
    expect(() => jwt.verify(generateAccessToken(fakeUser), process.env.JWT_ACCESS_SECRET)).not.toThrow();
  });

  it("not verifiable with JWT_REFRESH_SECRET (wrong secret branch)", () => {
    expect(() => jwt.verify(generateAccessToken(fakeUser), process.env.JWT_REFRESH_SECRET)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateRefreshToken — Data Flow Testing
// (only userId flows into payload — role/email are intentionally excluded)
// ─────────────────────────────────────────────────────────────────────────────

describe("[DataFlow] generateRefreshToken — minimal payload (only userId, no role or email)", () => {
  it("payload contains only userId — role and email are not included (data minimisation)", () => {
    const decoded = jwt.decode(generateRefreshToken(fakeUser));
    expect(decoded.userId).toBe(fakeUser._id);
    expect(decoded.role).toBeUndefined();
    expect(decoded.email).toBeUndefined();
    expect(decoded.fullName).toBeUndefined();
  });

  it("token has an expiry derived from REFRESH_TOKEN_EXPIRY env var (exp > iat)", () => {
    const decoded = jwt.decode(generateRefreshToken(fakeUser));
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});

describe("[Branch] generateRefreshToken — secret isolation branches", () => {
  it("verifiable with JWT_REFRESH_SECRET (correct secret branch)", () => {
    expect(() => jwt.verify(generateRefreshToken(fakeUser), process.env.JWT_REFRESH_SECRET)).not.toThrow();
  });

  it("not verifiable with JWT_ACCESS_SECRET (wrong secret branch)", () => {
    expect(() => jwt.verify(generateRefreshToken(fakeUser), process.env.JWT_ACCESS_SECRET)).toThrow();
  });
});
