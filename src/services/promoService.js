import PromoAd from "../models/PromoAd.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound() {
  const err = new Error("Promo Ad not found");
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

function toBase64(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

// ─── Promo Service ────────────────────────────────────────────────────────────

export async function listPromoAds() {
  return PromoAd.find().select("name description imageBase64").sort({ createdAt: -1 }).lean();
}

export async function createPromoAd({ name, description }, file) {
  if (!name) throw badRequest("name is required");
  if (!file) throw badRequest("Image is required");

  return PromoAd.create({ name, description, imageBase64: toBase64(file) });
}

export async function updatePromoAd(id, { name, description }, file) {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (file) updates.imageBase64 = toBase64(file);

  const promo = await PromoAd.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
  if (!promo) throw notFound();
  return promo;
}

export async function deletePromoAd(id) {
  // Hard delete — PromoAd schema has no isActive field so soft-delete was a no-op
  const promo = await PromoAd.findByIdAndDelete(id);
  if (!promo) throw notFound();
}
