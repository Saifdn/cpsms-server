import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { encrypt, decrypt } from "../../src/utils/crypto.js";

describe("encrypt", () => {
  it("returns null for null input", () => {
    expect(encrypt(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(encrypt(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(encrypt("")).toBeNull();
  });

  it("produces output with two colons (iv:tag:ciphertext format)", () => {
    const result = encrypt("hello");
    const parts = result.split(":");
    expect(parts).toHaveLength(3);
    parts.forEach((p) => expect(p.length).toBeGreaterThan(0));
  });

  it("produces different ciphertext on each call (random IV)", () => {
    const a = encrypt("same input");
    const b = encrypt("same input");
    expect(a).not.toBe(b);
  });
});

describe("decrypt", () => {
  it("returns null for null input", () => {
    expect(decrypt(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(decrypt(undefined)).toBeNull();
  });

  it("throws on malformed stored string (missing colons)", () => {
    expect(() => decrypt("onlyone:colon")).toThrow("Invalid encrypted token format");
  });

  it("throws when stored string is completely invalid hex", () => {
    expect(() => decrypt("zzzz:zzzz:zzzz")).toThrow();
  });
});

describe("encrypt → decrypt round-trip", () => {
  it("recovers the original string", () => {
    const original = "my-secret-reset-token-xyz";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("handles strings with special characters", () => {
    const original = "test+value/with=padding==";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("handles long strings", () => {
    const original = "a".repeat(256);
    expect(decrypt(encrypt(original))).toBe(original);
  });
});

describe("encrypt — ENCRYPTION_KEY validation", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY must be a 64-character hex string");
  });

  it("throws when ENCRYPTION_KEY is wrong length", () => {
    process.env.ENCRYPTION_KEY = "tooshort";
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY must be a 64-character hex string");
  });
});
