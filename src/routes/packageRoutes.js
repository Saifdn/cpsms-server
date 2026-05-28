import express from "express";
import {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
} from "../controllers/packageController.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Any authenticated user can view packages (graduates need this to book)
router.get("/",    verifyAccessToken, getAllPackages);
router.get("/:id", verifyAccessToken, getPackageById);

// Staff+ can create, update, delete
router.post("/",    verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), createPackage);
router.put("/:id",  verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), updatePackage);
router.delete("/:id", verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), deletePackage);

export default router;
