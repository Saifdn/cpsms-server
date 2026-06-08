import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import { verifyAccessToken, authorizeRoles } from "../../src/middleware/authMiddleware.js";

function makeReq(authHeader) {
  return { headers: authHeader ? { authorization: authHeader } : {} };
}

function makeRes() {
  return { sendStatus: jest.fn() };
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyAccessToken — all tests are Branch tests (every if/else path in the middleware)
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] verifyAccessToken — Authorization header and token validation branches", () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  it("sends 401 when Authorization header is absent (!authHeader branch)", () => {
    const req = makeReq(null);
    const res = makeRes();
    verifyAccessToken(req, res, next);
    expect(res.sendStatus).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("sends 403 when token is expired (jwt.verify error branch)", (done) => {
    const expired = jwt.sign(
      { userId: "u1", role: "graduate" },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: -1 }
    );
    const req = makeReq(`Bearer ${expired}`);
    const res = makeRes();
    verifyAccessToken(req, res, () => done(new Error("next() should not have been called")));
    setTimeout(() => {
      expect(res.sendStatus).toHaveBeenCalledWith(403);
      done();
    }, 10);
  });

  it("sends 403 when token has wrong signature (jwt.verify error branch)", (done) => {
    const token = jwt.sign({ userId: "u1" }, "wrong-secret");
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    verifyAccessToken(req, res, () => done(new Error("next() should not have been called")));
    setTimeout(() => {
      expect(res.sendStatus).toHaveBeenCalledWith(403);
      done();
    }, 10);
  });

  it("sends 403 when token is malformed (jwt.verify error branch)", (done) => {
    const req = makeReq("Bearer not-a-jwt");
    const res = makeRes();
    verifyAccessToken(req, res, () => done(new Error("next() should not have been called")));
    setTimeout(() => {
      expect(res.sendStatus).toHaveBeenCalledWith(403);
      done();
    }, 10);
  });

  it("sets req.user and calls next() when token is valid (success branch)", (done) => {
    const payload = { userId: "u1", role: "graduate", fullName: "Test", email: "t@t.com" };
    const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    verifyAccessToken(req, res, () => {
      expect(req.user.userId).toBe("u1");
      expect(req.user.role).toBe("graduate");
      expect(res.sendStatus).not.toHaveBeenCalled();
      done();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// authorizeRoles — Branch tests for role inclusion check
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] authorizeRoles — role inclusion check branches", () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  it("sends 403 when user role is not in the allowed list (!roles.includes branch)", () => {
    const req = { user: { role: "graduate" } };
    const res = makeRes();
    authorizeRoles("admin")(req, res, next);
    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user role is in the allowed list (roles.includes true branch)", () => {
    const req = { user: { role: "admin" } };
    const res = makeRes();
    authorizeRoles("admin", "superadmin")(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.sendStatus).not.toHaveBeenCalled();
  });

  it("calls next() for superadmin when both admin and superadmin are allowed", () => {
    const req = { user: { role: "superadmin" } };
    const res = makeRes();
    authorizeRoles("admin", "superadmin")(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("denies staff when only admin role is allowed", () => {
    const req = { user: { role: "staff" } };
    const res = makeRes();
    authorizeRoles("admin")(req, res, next);
    expect(res.sendStatus).toHaveBeenCalledWith(403);
  });
});
