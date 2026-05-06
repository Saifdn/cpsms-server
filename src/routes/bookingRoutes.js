import express from "express";
import {
  getAllBookings,
  getBookingById,
  getBookingByNumber,
  createBooking,
  updateBooking,
  cancelBooking,
  // checkInBooking,          // ← New for registration counter
} from "../controllers/bookingController.js";
import { verifyAccessToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyAccessToken);

// Public / General routes
router.get("/", getAllBookings);
router.get("/:id", getBookingById);

// New: Get booking by bookingNumber (important for QR scanning)
router.get("/number/:bookingNumber", getBookingByNumber);

// Create booking
router.post("/", createBooking);

// Update booking (status, check-in, etc.)
router.put("/:id", updateBooking);

// Cancel booking
router.put("/:id/cancel", cancelBooking);

// Check-in route (used by Registration Counter)
// router.post("/checkin", checkInBooking);

export default router;