import Package from "../models/Package.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound() {
  const err = new Error("Package not found");
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

// ─── Package Service ──────────────────────────────────────────────────────────

const PACKAGE_PROJECTION = "-__v -createdAt -updatedAt";
const PACKAGE_UPDATE_FIELDS = ["name", "description", "price", "services", "isPopular"];

export async function listPackages() {
  return Package.find().select(PACKAGE_PROJECTION).sort({ price: 1 }).lean();
}

export async function getPackage(id) {
  const pkg = await Package.findById(id).lean();
  if (!pkg) throw notFound();
  return pkg;
}

export async function createPackage({ name, description, price, services, isPopular }) {
  if (!name || price === undefined || price === null || !services) {
    throw badRequest("name, price and services are required");
  }
  if (typeof price !== "number" || price < 0) {
    throw badRequest("price must be a non-negative number");
  }

  return Package.create({ name, description, price, services, isPopular });
}

export async function updatePackage(id, body) {
  const allowed = {};
  for (const key of PACKAGE_UPDATE_FIELDS) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const pkg = await Package.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).lean();
  if (!pkg) throw notFound();
  return pkg;
}

export async function deletePackage(id) {
  const pkg = await Package.findByIdAndDelete(id);
  if (!pkg) throw notFound();
}
