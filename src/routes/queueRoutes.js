import express from "express";
import {
  getActiveQueue,
  getQueueLog,
  getQueueStatusByBooking,
  checkIn,
  callNext,
  confirmArrival,
  checkOut,
  skipCustomer,
} from "../controllers/queueController.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// All queue routes require authentication
router.use(verifyAccessToken);

// Any authenticated user can view the active queue (graduates can see their position)
router.get("/active", getActiveQueue);
router.get("/status/:bookingId", getQueueStatusByBooking);

// Staff+ only — full paginated queue log
router.get("/log", authorizeRoles("staff", "admin", "superadmin"), getQueueLog);

// Staff+ only — all queue state mutations
router.post("/checkin",          authorizeRoles("staff", "admin", "superadmin"), checkIn);
router.post("/call-next",        authorizeRoles("staff", "admin", "superadmin"), callNext);
router.post("/confirm-arrival",  authorizeRoles("staff", "admin", "superadmin"), confirmArrival);
router.post("/checkout",         authorizeRoles("staff", "admin", "superadmin"), checkOut);
router.post("/skip",             authorizeRoles("staff", "admin", "superadmin"), skipCustomer);

export default router;
