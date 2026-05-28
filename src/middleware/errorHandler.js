export function errorHandler(err, req, res, next) {
  console.error(err);

  // Mongoose: invalid ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  // Mongoose: duplicate key
  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: "Email already exists" });
  }

  // Mongoose: validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((e) => e.message).join(", ");
    return res.status(400).json({ success: false, message });
  }

  // Operational errors thrown intentionally in service layer
  if (err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Unhandled/unexpected errors — don't leak internals
  res.status(500).json({ success: false, message: "Server error" });
}
