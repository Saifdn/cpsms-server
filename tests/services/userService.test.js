import { jest, describe, it, expect, beforeEach } from "@jest/globals";

jest.mock("../../src/models/Graduate.js", () => ({
  __esModule: true,
  default: { create: jest.fn(), findById: jest.fn(), findOne: jest.fn(), findByIdAndUpdate: jest.fn(), findByIdAndDelete: jest.fn(), countDocuments: jest.fn(), find: jest.fn() },
}));
jest.mock("../../src/models/Staff.js", () => ({
  __esModule: true,
  default: { create: jest.fn(), findById: jest.fn(), findByIdAndUpdate: jest.fn(), findByIdAndDelete: jest.fn(), countDocuments: jest.fn(), find: jest.fn() },
}));
jest.mock("../../src/models/Admin.js", () => ({
  __esModule: true,
  default: { create: jest.fn(), findById: jest.fn(), findByIdAndUpdate: jest.fn(), findByIdAndDelete: jest.fn(), countDocuments: jest.fn(), find: jest.fn() },
}));
jest.mock("../../src/models/User.js", () => ({
  __esModule: true,
  default: { findById: jest.fn(), findByIdAndUpdate: jest.fn() },
}));
jest.mock("../../src/utils/sendWelcomeEmail.js", () => ({
  __esModule: true,
  sendWelcomeEmail: jest.fn(),
}));

import Graduate from "../../src/models/Graduate.js";
import Staff from "../../src/models/Staff.js";
import Admin from "../../src/models/Admin.js";
import User from "../../src/models/User.js";
import { sendWelcomeEmail } from "../../src/utils/sendWelcomeEmail.js";

import {
  createGraduate,
  updateGraduate,
  listGraduates,
  createAdmin,
  createStaff,
  getUserMe,
} from "../../src/services/userService.js";

describe("[Branch] createGraduate — input validation and normalization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendWelcomeEmail.mockResolvedValue(true);
  });

  it("throws 400 when fullName is missing", async () => {
    await expect(createGraduate({ email: "a@b.com", phone: "+60123456789" }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when email is missing", async () => {
    await expect(createGraduate({ fullName: "Test", phone: "+60123456789" }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when phone is missing", async () => {
    await expect(createGraduate({ fullName: "Test", email: "a@b.com" }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("normalizes email to lowercase", async () => {
    Graduate.create.mockResolvedValue({
      _id: "g1", fullName: "Test User", email: "test@test.com", phone: "+60123456789", role: "graduate",
    });

    await createGraduate({ fullName: "Test User", email: "TEST@TEST.COM", phone: "+60123456789" });

    const createArg = Graduate.create.mock.calls[0][0];
    expect(createArg.email).toBe("test@test.com");
  });

  it("normalizes fullName to Title Case", async () => {
    Graduate.create.mockResolvedValue({
      _id: "g1", fullName: "Ahmad Saifudin", email: "a@test.com", phone: "+60123456789", role: "graduate",
    });

    await createGraduate({ fullName: "ahmad saifudin", email: "a@test.com", phone: "+60123456789" });

    const createArg = Graduate.create.mock.calls[0][0];
    expect(createArg.fullName).toBe("Ahmad Saifudin");
  });

  it("fires sendWelcomeEmail as fire-and-forget", async () => {
    Graduate.create.mockResolvedValue({
      _id: "g1", fullName: "Test", email: "t@t.com", phone: "+60123456789", role: "graduate",
    });

    await createGraduate({ fullName: "Test", email: "t@t.com", phone: "+60123456789" });

    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  it("returns only safe fields — no password in response", async () => {
    Graduate.create.mockResolvedValue({
      _id: "g1", fullName: "Test", email: "t@t.com", phone: "+60123456789", role: "graduate",
    });

    const result = await createGraduate({ fullName: "Test", email: "t@t.com", phone: "+60123456789" });

    expect(result).toEqual({ id: "g1", fullName: "Test", email: "t@t.com", phone: "+60123456789", role: "graduate" });
    expect(result.password).toBeUndefined();
  });

  it("does not throw when sendWelcomeEmail rejects", async () => {
    Graduate.create.mockResolvedValue({
      _id: "g1", fullName: "Test", email: "t@t.com", phone: "+60123456789", role: "graduate",
    });
    sendWelcomeEmail.mockRejectedValue(new Error("smtp error"));

    await expect(
      createGraduate({ fullName: "Test", email: "t@t.com", phone: "+60123456789" })
    ).resolves.toBeDefined();
  });

  it("generates a random password internally (not provided by caller)", async () => {
    Graduate.create.mockResolvedValue({
      _id: "g1", fullName: "Test", email: "t@t.com", phone: "+60123456789", role: "graduate",
    });

    await createGraduate({ fullName: "Test", email: "t@t.com", phone: "+60123456789" });

    const createArg = Graduate.create.mock.calls[0][0];
    expect(createArg.password).toBeDefined();
    expect(typeof createArg.password).toBe("string");
    expect(createArg.password.length).toBeGreaterThan(10);
  });
});

describe("[Branch] updateGraduate — field whitelist and normalization", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when graduate not found", async () => {
    Graduate.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });
    await expect(updateGraduate("nonexistent", { fullName: "New Name" }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("only passes whitelisted GRADUATE_UPDATE_FIELDS to the DB", async () => {
    const fake = { _id: "g1", fullName: "New Name" };
    Graduate.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(fake),
    });

    await updateGraduate("g1", {
      fullName: "New Name",
      password: "hacked",
      role: "admin",
      email: "new@test.com",
    });

    const updatePayload = Graduate.findByIdAndUpdate.mock.calls[0][1];
    expect(updatePayload.fullName).toBeDefined();
    expect(updatePayload.email).toBeDefined();
    expect(updatePayload.password).toBeUndefined();
    expect(updatePayload.role).toBeUndefined();
  });

  it("normalizes fullName and email in update payload", async () => {
    Graduate.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: "g1" }),
    });

    await updateGraduate("g1", { fullName: "john doe", email: "JOHN@TEST.COM" });

    const updatePayload = Graduate.findByIdAndUpdate.mock.calls[0][1];
    expect(updatePayload.fullName).toBe("John Doe");
    expect(updatePayload.email).toBe("john@test.com");
  });
});

describe("[DataFlow] listGraduates — pagination metadata computation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns paginated results with correct pagination metadata", async () => {
    Graduate.countDocuments.mockResolvedValue(50);
    Graduate.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const result = await listGraduates({ page: 2, limit: 10 });

    expect(result.pagination.total).toBe(50);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.totalPages).toBe(5);
  });

  it("returns all results when no search filter is provided", async () => {
    Graduate.countDocuments.mockResolvedValue(3);
    const fakeGrads = [{ _id: "g1" }, { _id: "g2" }, { _id: "g3" }];
    Graduate.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(fakeGrads),
    });

    const result = await listGraduates({});

    expect(Graduate.find).toHaveBeenCalledWith({});
    expect(result.data).toHaveLength(3);
  });

  it("builds $or search filter when search is provided", async () => {
    Graduate.countDocuments.mockResolvedValue(1);
    Graduate.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: "g1" }]),
    });

    await listGraduates({ search: "ahmad" });

    const filterArg = Graduate.find.mock.calls[0][0];
    expect(filterArg.$or).toBeDefined();
    expect(filterArg.$or).toHaveLength(2);
    expect(filterArg.$or[0].fullName.$regex).toContain("ahmad");
  });
});

describe("[Branch] createAdmin — role validation branches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendWelcomeEmail.mockResolvedValue(true);
  });

  it("throws 400 when required fields are missing", async () => {
    await expect(createAdmin({ email: "x@x.com", phone: "+60123456789", role: "admin" }))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(createAdmin({ fullName: "X", phone: "+60123456789", role: "admin" }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 for invalid role", async () => {
    await expect(createAdmin({ fullName: "X", email: "x@x.com", phone: "+60123456789", role: "superuser" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Invalid role. Must be 'admin' or 'superadmin'" });
  });

  it("accepts role 'admin'", async () => {
    Admin.create.mockResolvedValue({ _id: "a1", fullName: "X", email: "x@x.com", phone: "+60", role: "admin" });
    await expect(createAdmin({ fullName: "X", email: "x@x.com", phone: "+60123456789", role: "admin" }))
      .resolves.toBeDefined();
  });

  it("accepts role 'superadmin'", async () => {
    Admin.create.mockResolvedValue({ _id: "a1", fullName: "X", email: "x@x.com", phone: "+60", role: "superadmin" });
    await expect(createAdmin({ fullName: "X", email: "x@x.com", phone: "+60123456789", role: "superadmin" }))
      .resolves.toBeDefined();
  });

  it("defaults role to 'admin' when not provided", async () => {
    Admin.create.mockResolvedValue({ _id: "a1", fullName: "X", email: "x@x.com", phone: "+60", role: "admin" });

    await createAdmin({ fullName: "X", email: "x@x.com", phone: "+60123456789" });

    const createArg = Admin.create.mock.calls[0][0];
    expect(createArg.role).toBe("admin");
  });
});

describe("[Branch] createStaff — required field validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendWelcomeEmail.mockResolvedValue(true);
  });

  it("throws 400 when department is missing", async () => {
    await expect(createStaff({ fullName: "X", email: "x@x.com", phone: "+60123456789" }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("creates staff with correct role", async () => {
    Staff.create.mockResolvedValue({ _id: "s1", fullName: "X", email: "x@x.com", phone: "+60", department: "IT", role: "staff" });

    await createStaff({ fullName: "X", email: "x@x.com", phone: "+60123456789", department: "IT" });

    const createArg = Staff.create.mock.calls[0][0];
    expect(createArg.role).toBe("staff");
  });
});

describe("[Path] getUserMe — not found vs found paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when user not found", async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(getUserMe("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns user data when found", async () => {
    const user = { _id: "u1", fullName: "Test", email: "t@t.com", phone: "+60", role: "graduate" };
    User.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(user) });
    const result = await getUserMe("u1");
    expect(result).toEqual(user);
  });
});

// Additional coverage for simpler CRUD functions
import {
  getGraduate,
  deleteGraduate,
  listAdmins,
  getAdmin,
  deleteAdmin,
  updateAdmin,
  listStaff,
  getStaff,
  deleteStaff,
  updateStaff,
  updateUserMe,
} from "../../src/services/userService.js";

describe("[Path] getGraduate — not found vs found paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when graduate not found", async () => {
    Graduate.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(getGraduate("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns graduate when found", async () => {
    const doc = { _id: "g1", fullName: "Test" };
    Graduate.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(doc) });
    const result = await getGraduate("g1");
    expect(result).toEqual(doc);
  });
});

describe("[Path] deleteGraduate — not found vs deleted paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when graduate not found", async () => {
    Graduate.findByIdAndDelete.mockResolvedValue(null);
    await expect(deleteGraduate("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("resolves when graduate is deleted", async () => {
    Graduate.findByIdAndDelete.mockResolvedValue({ _id: "g1" });
    await expect(deleteGraduate("g1")).resolves.toBeUndefined();
  });
});

describe("[DataFlow] listAdmins — pagination metadata computation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns paginated admins", async () => {
    Admin.countDocuments.mockResolvedValue(2);
    Admin.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: "a1" }, { _id: "a2" }]),
    });
    const result = await listAdmins({});
    expect(result.pagination.total).toBe(2);
  });
});

describe("[Path] getAdmin — not found vs found paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when admin not found", async () => {
    Admin.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(getAdmin("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns admin when found", async () => {
    const doc = { _id: "a1", role: "admin" };
    Admin.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(doc) });
    expect(await getAdmin("a1")).toEqual(doc);
  });
});

describe("[Path] deleteAdmin — not found vs deleted paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when admin not found", async () => {
    Admin.findByIdAndDelete.mockResolvedValue(null);
    await expect(deleteAdmin("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("resolves when admin is deleted", async () => {
    Admin.findByIdAndDelete.mockResolvedValue({ _id: "a1" });
    await expect(deleteAdmin("a1")).resolves.toBeUndefined();
  });
});

describe("[Branch] updateAdmin — not found vs updated branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when admin not found", async () => {
    Admin.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(updateAdmin("nonexistent", { fullName: "X" })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("updates and returns admin", async () => {
    const doc = { _id: "a1", fullName: "X" };
    Admin.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(doc) });
    const result = await updateAdmin("a1", { fullName: "x" });
    expect(result).toEqual(doc);
  });
});

describe("[Branch] listStaff / getStaff / deleteStaff / updateStaff — field whitelist and not found branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("listStaff returns paginated results", async () => {
    Staff.countDocuments.mockResolvedValue(1);
    Staff.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: "s1" }]),
    });
    const result = await listStaff({});
    expect(result.pagination.total).toBe(1);
  });

  it("getStaff throws 404 when not found", async () => {
    Staff.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(getStaff("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("getStaff returns staff when found", async () => {
    const doc = { _id: "s1", fullName: "Staff Member", role: "staff" };
    Staff.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(doc) });
    expect(await getStaff("s1")).toEqual(doc);
  });

  it("deleteStaff throws 404 when not found", async () => {
    Staff.findByIdAndDelete.mockResolvedValue(null);
    await expect(deleteStaff("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("deleteStaff resolves when found", async () => {
    Staff.findByIdAndDelete.mockResolvedValue({ _id: "s1" });
    await expect(deleteStaff("s1")).resolves.toBeUndefined();
  });

  it("updateStaff throws 404 when not found", async () => {
    Staff.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(updateStaff("nonexistent", { fullName: "X" })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("updateStaff only updates STAFF_UPDATE_FIELDS", async () => {
    const doc = { _id: "s1" };
    Staff.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(doc) });
    await updateStaff("s1", { fullName: "New", password: "hacked" });
    const payload = Staff.findByIdAndUpdate.mock.calls[0][1];
    expect(payload.fullName).toBe("New");
    expect(payload.password).toBeUndefined();
  });
});

describe("[DataFlow] updateUserMe — field normalization before update", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when user not found", async () => {
    User.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(updateUserMe("nonexistent", { fullName: "X" })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("normalizes fullName in update", async () => {
    const doc = { _id: "u1", fullName: "John Doe" };
    User.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(doc) });
    await updateUserMe("u1", { fullName: "john doe" });
    const payload = User.findByIdAndUpdate.mock.calls[0][1];
    expect(payload.fullName).toBe("John Doe");
  });
});
