import express from "express";
import {
  checkIn,
  callNext,
  checkOut,
  getActiveQueue,
} from "../controllers/queueController.js";

const router = express.Router();

router.post("/checkin", checkIn);           // Registration Counter
router.post("/call-next", callNext);        // When studio becomes free
router.post("/checkout", checkOut);         // When user finishes
router.get("/active", getActiveQueue);      // For waiting area screen

export default router;