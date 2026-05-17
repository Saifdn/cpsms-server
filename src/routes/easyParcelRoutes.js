import express from "express";
import { verifyAccessToken } from "../middleware/authMiddleware.js";
import {
  startEasyParcelOAuth,
  handleEasyParcelCallback,
} from "../controllers/easyParcelController.js";

const router = express.Router();

// Start OAuth
router.get("/auth/connect", startEasyParcelOAuth);

// OAuth Callback
router.get("/auth/callback", handleEasyParcelCallback);

export default router;