import Frame from "../models/Frame.js";

function notFound(message = "Frame not found") {
  const err = new Error(message);
  err.statusCode = 404;
  err.isOperational = true;
  return err;
}

export async function listFrames() {
  return Frame.find({ isActive: true }).sort({ price: 1 }).lean();
}

export async function listAllFrames() {
  return Frame.find().sort({ price: 1 }).lean();
}

export async function createFrame(data) {
  return Frame.create(data);
}

export async function updateFrame(id, data) {
  const allowed = {};
  for (const key of ["name", "description", "price", "isActive"]) {
    if (data[key] !== undefined) allowed[key] = data[key];
  }
  const frame = await Frame.findByIdAndUpdate(id, allowed, { new: true, runValidators: true });
  if (!frame) throw notFound();
  return frame;
}

export async function deleteFrame(id) {
  const frame = await Frame.findByIdAndDelete(id);
  if (!frame) throw notFound();
}
