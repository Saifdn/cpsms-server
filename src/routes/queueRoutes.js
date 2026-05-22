// routes/queueRoutes.js
import express from "express";
import {
  getActiveQueue,
  checkIn,
  callNext,
  confirmArrival,
  checkOut,
  skipCustomer,
} from "../controllers/queueController.js";

const router = express.Router();

router.get("/active", getActiveQueue);
router.post("/checkin", checkIn);           // Registration Counter
router.post("/call-next", callNext);        // Studio Counter
router.post("/confirm-arrival", confirmArrival); // Customer scan at studio
router.post("/checkout", checkOut);         // Studio Counter
router.post("/skip", skipCustomer);         // Staff skips a no-show customer

export default router;