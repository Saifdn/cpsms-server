import Studio from "../models/Studio.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound(message = "Studio not found") {
  const err = new Error(message);
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

// ─── Studio Service ───────────────────────────────────────────────────────────

const STUDIO_PROJECTION = "name location description isAvailable isOccupied";
const STUDIO_UPDATE_FIELDS = ["name", "location", "description"];

export async function listStudios() {
  return Studio.find().select(STUDIO_PROJECTION).sort({ name: 1 }).lean();
}

export async function getStudio(id) {
  const studio = await Studio.findById(id).lean();
  if (!studio) throw notFound();
  return studio;
}

export async function createStudio({ name, location, description }) {
  if (!name || !location) throw badRequest("Name and location are required");

  return Studio.create({ name, location, description, isAvailable: true, isOccupied: false });
}

export async function toggleAvailability(id, isAvailable) {
  if (typeof isAvailable !== "boolean") throw badRequest("isAvailable must be a boolean");

  const studio = await Studio.findByIdAndUpdate(
    id,
    { isAvailable },
    { new: true, runValidators: true }
  ).lean();
  if (!studio) throw notFound();
  return studio;
}

export async function updateStudio(id, body) {
  const allowed = {};
  for (const key of STUDIO_UPDATE_FIELDS) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const studio = await Studio.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).lean();
  if (!studio) throw notFound();
  return studio;
}

export async function deleteStudio(id) {
  const studio = await Studio.findByIdAndDelete(id);
  if (!studio) throw notFound();
}
