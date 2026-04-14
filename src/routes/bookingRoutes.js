import express from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
} from "../controllers/bookingController.js";

const router = express.Router();

// Get all bookings + filters
router.get("/", getAllBookings);

// Get single booking
router.get("/:id", getBookingById);

// Create booking
router.post("/", createBooking);

// Update booking (status, check-in, etc.)
router.put("/:id", updateBooking);

// Cancel booking
router.put("/:id/cancel", cancelBooking);

export default router;