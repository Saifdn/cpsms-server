import express from "express";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  startEasyParcelOAuth,
  handleEasyParcelCallback,
  getEasyParcelStatus,
  disconnectEasyParcel,
  trackingStatusWebhook,
} from "../controllers/easyParcelController.js";

const router = express.Router();

// Public — OAuth browser redirects (no Bearer token available in browser redirect)
router.get("/auth/connect", startEasyParcelOAuth);
router.get("/auth/callback", handleEasyParcelCallback);

// Public — EasyParcel server-to-server webhook
router.post("/webhook", trackingStatusWebhook);

// Admin-only — connection management
router.get("/status", verifyAccessToken, authorizeRoles("superadmin", "admin"), getEasyParcelStatus);
router.delete("/disconnect", verifyAccessToken, authorizeRoles("superadmin", "admin"), disconnectEasyParcel);

export default router;
