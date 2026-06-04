import { describe, it, expect } from "@jest/globals";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken, generateResetPasswordToken } from "../../src/utils/generateTokens.js";

const fakeUser = {
  _id: "64f0000000000000000000a1",
  role: "graduate",
  fullName: "Test User",
  email: "test@test.com",
};

describe("generateAccessToken", () => {
  it("returns a string with three dot-separated JWT parts", () => {
    const token = generateAccessToken(fakeUser);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("payload contains userId, role, fullName, email", () => {
    const token = generateAccessToken(fakeUser);
    const decoded = jwt.decode(token);
    expect(decoded.userId).toBe(fakeUser._id);
    expect(decoded.role).toBe(fakeUser.role);
    expect(decoded.fullName).toBe(fakeUser.fullName);
    expect(decoded.email).toBe(fakeUser.email);
  });

  it("token has an expiry (exp > iat)", () => {
    const token = generateAccessToken(fakeUser);
    const decoded = jwt.decode(token);
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it("is verifiable with JWT_ACCESS_SECRET", () => {
    const token = generateAccessToken(fakeUser);
    expect(() => jwt.verify(token, process.env.JWT_ACCESS_SECRET)).not.toThrow();
  });

  it("is NOT verifiable with JWT_REFRESH_SECRET (different secrets)", () => {
    const token = generateAccessToken(fakeUser);
    expect(() => jwt.verify(token, process.env.JWT_REFRESH_SECRET)).toThrow();
  });
});

describe("generateRefreshToken", () => {
  it("returns a string with three dot-separated JWT parts", () => {
    const token = generateRefreshToken(fakeUser);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("payload contains only userId — no role or email", () => {
    const token = generateRefreshToken(fakeUser);
    const decoded = jwt.decode(token);
    expect(decoded.userId).toBe(fakeUser._id);
    expect(decoded.role).toBeUndefined();
    expect(decoded.email).toBeUndefined();
    expect(decoded.fullName).toBeUndefined();
  });

  it("token has an expiry (exp > iat)", () => {
    const token = generateRefreshToken(fakeUser);
    const decoded = jwt.decode(token);
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it("is verifiable with JWT_REFRESH_SECRET", () => {
    const token = generateRefreshToken(fakeUser);
    expect(() => jwt.verify(token, process.env.JWT_REFRESH_SECRET)).not.toThrow();
  });

  it("is NOT verifiable with JWT_ACCESS_SECRET", () => {
    const token = generateRefreshToken(fakeUser);
    expect(() => jwt.verify(token, process.env.JWT_ACCESS_SECRET)).toThrow();
  });
});

describe("generateResetPasswordToken", () => {
  it("can be called without throwing", () => {
    expect(() => generateResetPasswordToken()).not.toThrow();
  });
});
