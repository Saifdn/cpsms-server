import express from "express";
import {
  generateSessions,
  getAllSessions,
  updateSession,
  deleteSession,
} from "../controllers/sessionController.js";

const router = express.Router();

// Generate sessions (main feature)
router.post("/generate", generateSessions);

// Get sessions
router.get("/", getAllSessions);

// Update single session
router.put("/:id", updateSession);

// Delete single session
router.delete("/:id", deleteSession);

export default router;