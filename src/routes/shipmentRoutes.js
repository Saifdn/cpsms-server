import express from "express";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";
import ensureEasyParcel from "../middleware/ensureEasyParcel.js";
import {
  getPendingShipments,
  getSubmittedShipments,
  getQuotation,
  submitOrder,
  getWalletBalance,
  mergeAwb,
  getFrameOrderPendingShipments,
  getFrameOrderSubmittedShipments,
  getFrameOrderQuotation,
  submitFrameOrderShipment,
  mergeFrameOrderAwb,
} from "../controllers/shipmentController.js";

const router = express.Router();

// All shipment routes are staff+ only — apply auth globally
router.use(verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"));

// DB-only queries (no EasyParcel token needed)
router.get("/pending",      getPendingShipments);
router.get("/submitted",    getSubmittedShipments);
router.post("/merge-awb",   mergeAwb);

// EasyParcel API routes (token auto-refreshed by ensureEasyParcel)
router.post("/quotation", ensureEasyParcel, getQuotation);
router.post("/submit",    ensureEasyParcel, submitOrder);
router.get("/wallet",     ensureEasyParcel, getWalletBalance);

// Frame order shipment routes
router.get("/frame-orders/pending",        getFrameOrderPendingShipments);
router.get("/frame-orders/submitted",      getFrameOrderSubmittedShipments);
router.post("/frame-orders/merge-awb",     mergeFrameOrderAwb);
router.post("/frame-orders/quotation",     ensureEasyParcel, getFrameOrderQuotation);
router.post("/frame-orders/submit",        ensureEasyParcel, submitFrameOrderShipment);

export default router;
