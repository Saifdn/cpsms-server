import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import { verifyAccessToken, authorizeRoles } from "../../src/middleware/authMiddleware.js";

function makeReq(authHeader) {
  return { headers: authHeader ? { authorization: authHeader } : {} };
}

function makeRes() {
  return { sendStatus: jest.fn() };
}

describe("verifyAccessToken", () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  it("calls res.sendStatus(401) when Authorization header is absent", () => {
    const req = makeReq(null);
    const res = makeRes();
    verifyAccessToken(req, res, next);
    expect(res.sendStatus).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls res.sendStatus(403) when token is expired", (done) => {
    const expired = jwt.sign(
      { userId: "u1", role: "graduate" },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: -1 }
    );
    const req = makeReq(`Bearer ${expired}`);
    const res = makeRes();
    verifyAccessToken(req, res, () => {
      done(new Error("next() should not have been called"));
    });
    setTimeout(() => {
      expect(res.sendStatus).toHaveBeenCalledWith(403);
      done();
    }, 10);
  });

  it("calls res.sendStatus(403) when token has wrong signature", (done) => {
    const token = jwt.sign({ userId: "u1" }, "wrong-secret");
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    verifyAccessToken(req, res, () => {
      done(new Error("next() should not have been called"));
    });
    setTimeout(() => {
      expect(res.sendStatus).toHaveBeenCalledWith(403);
      done();
    }, 10);
  });

  it("calls res.sendStatus(403) when token is malformed (not a JWT)", (done) => {
    const req = makeReq("Bearer not-a-jwt");
    const res = makeRes();
    verifyAccessToken(req, res, () => {
      done(new Error("next() should not have been called"));
    });
    setTimeout(() => {
      expect(res.sendStatus).toHaveBeenCalledWith(403);
      done();
    }, 10);
  });

  it("sets req.user and calls next() for a valid token", (done) => {
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

describe("authorizeRoles", () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  it("calls res.sendStatus(403) when user role is not in allowed list", () => {
    const req = { user: { role: "graduate" } };
    const res = makeRes();
    authorizeRoles("admin")(req, res, next);
    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user role matches", () => {
    const req = { user: { role: "admin" } };
    const res = makeRes();
    authorizeRoles("admin", "superadmin")(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.sendStatus).not.toHaveBeenCalled();
  });

  it("calls next() for superadmin when multiple roles are allowed", () => {
    const req = { user: { role: "superadmin" } };
    const res = makeRes();
    authorizeRoles("admin", "superadmin")(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("denies staff when only admin is allowed", () => {
    const req = { user: { role: "staff" } };
    const res = makeRes();
    authorizeRoles("admin")(req, res, next);
    expect(res.sendStatus).toHaveBeenCalledWith(403);
  });
});
