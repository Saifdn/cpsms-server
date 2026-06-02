import ratelimit from "../config/upstash.js";
import { logger } from "../utils/logger.js";

const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip;
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      logger.warn("Rate limit exceeded", { ip, method: req.method, url: req.originalUrl });
      return res.status(429).json({ success: false, message: "Too many requests, please slow down." });
    }
    next();
  } catch (err) {
    logger.error("Rate limiter error", { message: err.message });
    next();
  }
};

export default rateLimiter;
