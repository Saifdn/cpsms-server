import Addon from "../models/Addon.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound() {
  const err = new Error("Add-on not found");
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

// ─── Addon Service ────────────────────────────────────────────────────────────

const ADDON_PROJECTION = "-__v -createdAt -updatedAt";
const ADDON_UPDATE_FIELDS = ["name", "description", "price", "normalPrice"];

export async function listAddons() {
  return Addon.find().select(ADDON_PROJECTION).sort({ price: 1 }).lean();
}

export async function createAddon({ name, description, price, normalPrice }) {
  if (!name || price === undefined || price === null) {
    throw badRequest("name and price are required");
  }
  if (typeof price !== "number" || price < 0) {
    throw badRequest("price must be a non-negative number");
  }

  return Addon.create({ name, description, price, normalPrice });
}

export async function updateAddon(id, body) {
  const allowed = {};
  for (const key of ADDON_UPDATE_FIELDS) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const addon = await Addon.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).lean();
  if (!addon) throw notFound();
  return addon;
}

export async function deleteAddon(id) {
  const addon = await Addon.findByIdAndDelete(id);
  if (!addon) throw notFound();
}
