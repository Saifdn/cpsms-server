import { logger } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  const context = { method: req.method, url: req.originalUrl, ip: req.ip };

  if (err.name === "CastError") {
    logger.warn("Invalid ID format", context);
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  if (err.code === 11000) {
    logger.warn("Duplicate key violation", { ...context, keyValue: err.keyValue });
    return res.status(400).json({ success: false, message: "Email already exists" });
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((e) => e.message).join(", ");
    logger.warn("Validation error", { ...context, message });
    return res.status(400).json({ success: false, message });
  }

  if (err.isOperational) {
    logger.warn("Operational error", { ...context, statusCode: err.statusCode, message: err.message });
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  logger.error("Unhandled server error", { ...context, stack: err.stack, message: err.message });
  res.status(500).json({ success: false, message: "Server error" });
}
