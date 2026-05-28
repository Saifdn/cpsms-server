import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Graduate from "../models/Graduate.js";
import Staff from "../models/Staff.js";
import Admin from "../models/Admin.js";
import { sendWelcomeEmail } from "../utils/sendWelcomeEmail.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const USER_PROJECTION = "-refreshToken -password -passwordResetToken -__v";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generatePassword() {
  return crypto.randomBytes(8).toString("hex"); // 16-char hex
}

function buildSearchFilter(search, fields) {
  if (!search) return {};
  const escaped = escapeRegex(search.trim());
  return {
    $or: fields.map((field) => ({ [field]: { $regex: escaped, $options: "i" } })),
  };
}

async function paginate(Model, filter, { page = 1, limit = 20, select = USER_PROJECTION }) {
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const [total, docs] = await Promise.all([
    Model.countDocuments(filter),
    Model.find(filter).select(select).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
  ]);

  return {
    data: docs,
    count: docs.length,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function createUser(Model, payload, emailPayload) {
  const password = generatePassword();
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await Model.create({ ...payload, password: hashedPassword });

  // Fire-and-forget — email failure must not block the response
  sendWelcomeEmail({ ...emailPayload, password }).catch((err) =>
    console.error("sendWelcomeEmail failed:", err)
  );

  return user;
}

function notFound(resource) {
  const err = new Error(`${resource} not found`);
  err.statusCode = 404;
  err.isOperational = true;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.isOperational = true;
  return err;
}

// ─── Current User ────────────────────────────────────────────────────────────

export async function getUserMe(userId) {
  const user = await User.findById(userId).select("fullName email phone role").lean();
  if (!user) throw notFound("User");
  return user;
}

export async function updateUserMe(userId, { fullName, phone }) {
  const user = await User.findByIdAndUpdate(
    userId,
    { fullName, phone },
    { new: true, runValidators: true }
  )
    .select("fullName email phone role")
    .lean();
  if (!user) throw notFound("User");
  return user;
}

// ─── Graduate ────────────────────────────────────────────────────────────────

const GRADUATE_UPDATE_FIELDS = ["fullName", "email", "phone", "address", "postcode", "state"];

export async function listGraduates({ search, page, limit }) {
  const filter = buildSearchFilter(search, ["fullName", "email"]);
  return paginate(Graduate, filter, { page, limit });
}

export async function getGraduate(id) {
  const doc = await Graduate.findById(id).select(USER_PROJECTION).lean();
  if (!doc) throw notFound("Graduate");
  return doc;
}

export async function createGraduate({ fullName, email, phone }) {
  if (!fullName || !email || !phone) {
    throw badRequest("Please provide fullName, email and phone");
  }

  const user = await createUser(
    Graduate,
    { fullName, email, phone, role: "graduate" },
    { fullName, email, phone, role: "graduate" }
  );

  return { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role };
}

export async function updateGraduate(id, body) {
  const allowed = {};
  for (const key of GRADUATE_UPDATE_FIELDS) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const doc = await Graduate.findByIdAndUpdate(id, allowed, { new: true, runValidators: true })
    .select(USER_PROJECTION)
    .lean();
  if (!doc) throw notFound("Graduate");
  return doc;
}

export async function deleteGraduate(id) {
  const doc = await Graduate.findByIdAndDelete(id);
  if (!doc) throw notFound("Graduate");
}

// ─── Staff ───────────────────────────────────────────────────────────────────

const STAFF_UPDATE_FIELDS = ["fullName", "email", "phone", "department"];

export async function listStaff({ search, page, limit }) {
  const filter = buildSearchFilter(search, ["fullName", "email", "department"]);
  return paginate(Staff, filter, { page, limit });
}

export async function getStaff(id) {
  const doc = await Staff.findById(id).select(USER_PROJECTION).lean();
  if (!doc) throw notFound("Staff");
  return doc;
}

export async function createStaff({ fullName, email, phone, department }) {
  if (!fullName || !email || !phone || !department) {
    throw badRequest("Please provide fullName, email, phone and department");
  }

  const user = await createUser(
    Staff,
    { fullName, email, phone, department, role: "staff" },
    { fullName, email, phone, department, role: "staff" }
  );

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    department: user.department,
    role: user.role,
  };
}

export async function updateStaff(id, body) {
  const allowed = {};
  for (const key of STAFF_UPDATE_FIELDS) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const doc = await Staff.findByIdAndUpdate(id, allowed, { new: true, runValidators: true })
    .select(USER_PROJECTION)
    .lean();
  if (!doc) throw notFound("Staff");
  return doc;
}

export async function deleteStaff(id) {
  const doc = await Staff.findByIdAndDelete(id);
  if (!doc) throw notFound("Staff");
}

// ─── Admin ───────────────────────────────────────────────────────────────────

const ADMIN_UPDATE_FIELDS = ["fullName", "email", "phone"];
const VALID_ADMIN_ROLES = ["admin", "superadmin"];

export async function listAdmins({ search, page, limit }) {
  const filter = buildSearchFilter(search, ["fullName", "email"]);
  return paginate(Admin, filter, { page, limit });
}

export async function getAdmin(id) {
  const doc = await Admin.findById(id).select(USER_PROJECTION).lean();
  if (!doc) throw notFound("Admin");
  return doc;
}

export async function createAdmin({ fullName, email, phone, role = "admin" }) {
  if (!fullName || !email || !phone) {
    throw badRequest("Please provide fullName, email and phone");
  }
  if (!VALID_ADMIN_ROLES.includes(role)) {
    throw badRequest("Invalid role. Must be 'admin' or 'superadmin'");
  }

  const user = await createUser(
    Admin,
    { fullName, email, phone, role },
    { fullName, email, phone, role }
  );

  return { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role };
}

export async function updateAdmin(id, body) {
  const allowed = {};
  for (const key of ADMIN_UPDATE_FIELDS) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const doc = await Admin.findByIdAndUpdate(id, allowed, { new: true, runValidators: true })
    .select(USER_PROJECTION)
    .lean();
  if (!doc) throw notFound("Admin");
  return doc;
}

export async function deleteAdmin(id) {
  const doc = await Admin.findByIdAndDelete(id);
  if (!doc) throw notFound("Admin");
}
