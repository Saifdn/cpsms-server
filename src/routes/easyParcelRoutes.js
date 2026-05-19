import express from "express";
import { verifyAccessToken } from "../middleware/authMiddleware.js";
import {
  startEasyParcelOAuth,
  handleEasyParcelCallback,
  trackingStatusWebhook,
} from "../controllers/easyParcelController.js";

const router = express.Router();

router.get("/auth/connect", startEasyParcelOAuth);

router.get("/auth/callback", handleEasyParcelCallback);

router.post("/webhook", trackingStatusWebhook);

export default router;