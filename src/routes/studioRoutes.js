import express from "express";
import {
  getAllStudios,
  getStudioById,
  createStudio,
  toggleStudioAvailability,
  updateStudio,
  deleteStudio,
} from "../controllers/studioController.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Any authenticated user can view studios
router.get("/",    verifyAccessToken, getAllStudios);
router.get("/:id", verifyAccessToken, getStudioById);

// Staff+ can toggle availability (needed during live sessions)
router.put("/:id/availability", verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), toggleStudioAvailability);

// Admin+ can create/update; superadmin can delete
router.post("/",    verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), createStudio);
router.put("/:id",  verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), updateStudio);
router.delete("/:id", verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"),        deleteStudio);

export default router;
