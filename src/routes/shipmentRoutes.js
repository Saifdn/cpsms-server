import express from "express";
import { verifyAccessToken } from "../middleware/authMiddleware.js";
import ensureEasyParcel from "../middleware/ensureEasyParcel.js";

import {
  getPendingShipments,
  getSubmittedShipments,
  getQuotation,
  submitOrder,
  getWalletBalance,
} from "../controllers/shipmentController.js";

const router = express.Router();

router.get("/pending", getPendingShipments);
router.get("/submitted", getSubmittedShipments);

// Apply global middleware
router.use(verifyAccessToken, ensureEasyParcel);

// Shipment APIs
router.post("/quotation", getQuotation);
router.post("/submit", submitOrder);
router.get("/wallet", getWalletBalance);

export default router;