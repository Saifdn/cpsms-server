import express from "express";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";
import ensureEasyParcel from "../middleware/ensureEasyParcel.js";
import {
  getPendingShipments,
  getSubmittedShipments,
  getQuotation,
  submitOrder,
  getWalletBalance,
} from "../controllers/shipmentController.js";

const router = express.Router();

// All shipment routes are staff+ only — apply auth globally
router.use(verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"));

// DB-only queries (no EasyParcel token needed)
router.get("/pending",   getPendingShipments);
router.get("/submitted", getSubmittedShipments);

// EasyParcel API routes (token auto-refreshed by ensureEasyParcel)
router.post("/quotation", ensureEasyParcel, getQuotation);
router.post("/submit",    ensureEasyParcel, submitOrder);
router.get("/wallet",     ensureEasyParcel, getWalletBalance);

export default router;
