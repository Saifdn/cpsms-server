import express from "express";
import {
  getAllBookings,
  getBookingById,
  getBookingByNumber,
  createBooking,
  updateBooking,
  cancelBooking,
  billplzCallback
} from "../controllers/bookingController.js";
import { verifyAccessToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/billplz-callback", billplzCallback);

router.use(verifyAccessToken);

router.get("/", getAllBookings);
router.get("/number/:bookingNumber", getBookingByNumber);
router.get("/:id", getBookingById);
router.post("/", createBooking);
router.put("/:id", updateBooking);
router.put("/:id/cancel", cancelBooking);



export default router;