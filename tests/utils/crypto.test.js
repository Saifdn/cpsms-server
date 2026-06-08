import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { encrypt, decrypt } from "../../src/utils/crypto.js";

// ─────────────────────────────────────────────────────────────────────────────
// encrypt — Branch Testing (null/empty guards and key validation)
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] encrypt — null/falsy input guard branches", () => {
  it("returns null for null input (!plaintext branch)", () => {
    expect(encrypt(null)).toBeNull();
  });

  it("returns null for undefined input (!plaintext branch)", () => {
    expect(encrypt(undefined)).toBeNull();
  });

  it("returns null for empty string (!plaintext branch)", () => {
    expect(encrypt("")).toBeNull();
  });
});

describe("[Branch] encrypt — ENCRYPTION_KEY validation branches", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it("throws when ENCRYPTION_KEY is missing (getKey() validation branch)", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY must be a 64-character hex string");
  });

  it("throws when ENCRYPTION_KEY is wrong length (hex.length !== 64 branch)", () => {
    process.env.ENCRYPTION_KEY = "tooshort";
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY must be a 64-character hex string");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// decrypt — Branch Testing (null guard and format validation)
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] decrypt — null/falsy input and format validation branches", () => {
  it("returns null for null input (!stored branch)", () => {
    expect(decrypt(null)).toBeNull();
  });

  it("returns null for undefined input (!stored branch)", () => {
    expect(decrypt(undefined)).toBeNull();
  });

  it("throws on malformed string with only one colon (!ivHex || !tagHex || !dataHex branch)", () => {
    expect(() => decrypt("onlyone:colon")).toThrow("Invalid encrypted token format");
  });

  it("throws when stored string is completely invalid hex", () => {
    expect(() => decrypt("zzzz:zzzz:zzzz")).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// encrypt → decrypt — Data Flow Testing (plaintext → ciphertext → plaintext)
// ─────────────────────────────────────────────────────────────────────────────

describe("[DataFlow] encrypt → decrypt — plaintext transformation and round-trip recovery", () => {
  it("plaintext → AES-256-GCM ciphertext → back to plaintext (round-trip)", () => {
    const original = "my-secret-reset-token-xyz";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("output format is iv:authTag:ciphertext (data structured as three hex segments)", () => {
    const result = encrypt("hello");
    const parts = result.split(":");
    expect(parts).toHaveLength(3);
    parts.forEach((p) => expect(p.length).toBeGreaterThan(0));
  });

  it("same plaintext produces different ciphertext each call (random IV ensures unique output)", () => {
    expect(encrypt("same input")).not.toBe(encrypt("same input"));
  });

  it("handles special characters through the full transform chain", () => {
    const original = "test+value/with=padding==";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("handles long strings through the full transform chain", () => {
    expect(decrypt(encrypt("a".repeat(256)))).toBe("a".repeat(256));
  });
});
