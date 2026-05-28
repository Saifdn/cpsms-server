import express from "express";
import {
  generateSessions,
  getAllSessions,
  updateSession,
  deleteSession,
} from "../controllers/sessionController.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Any authenticated user can view sessions (graduates need this to book)
router.get("/", verifyAccessToken, getAllSessions);

// Staff+ can generate, update, delete sessions
router.post("/generate", verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), generateSessions);
router.put("/:id",       verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), updateSession);
router.delete("/:id",    verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), deleteSession);

export default router;
