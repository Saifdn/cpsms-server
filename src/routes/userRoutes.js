import express from "express";
import {
  getMe,
  updateMe,
  getAllGraduates,
  getGraduateById,
  createGraduate,
  updateGraduate,
  deleteGraduate,
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} from "../controllers/userController.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── Current User (any authenticated role) ───────────────────────────────────
router.get("/me",   verifyAccessToken, getMe);
router.patch("/me", verifyAccessToken, updateMe);

// ─── Graduates (staff+ can view, admin+ can mutate, superadmin can delete) ───
router.get("/graduates",        verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), getAllGraduates);
router.get("/graduates/:id",    verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), getGraduateById);
router.post("/graduates",       verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"),          createGraduate);
router.put("/graduates/:id",    verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"),          updateGraduate);
router.delete("/graduates/:id", verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"),                   deleteGraduate);

// ─── Staff (admin+ can view & mutate, superadmin can delete) ─────────────────
router.get("/staff",        verifyAccessToken, authorizeRoles("admin", "superadmin"), getAllStaff);
router.get("/staff/:id",    verifyAccessToken, authorizeRoles("admin", "superadmin"), getStaffById);
router.post("/staff",       verifyAccessToken, authorizeRoles("admin", "superadmin"), createStaff);
router.put("/staff/:id",    verifyAccessToken, authorizeRoles("admin", "superadmin"), updateStaff);
router.delete("/staff/:id", verifyAccessToken, authorizeRoles("admin", "superadmin"), deleteStaff);

// ─── Admins (superadmin only) ─────────────────────────────────────────────────
router.get("/admins",        verifyAccessToken, authorizeRoles("superadmin"), getAllAdmins);
router.get("/admins/:id",    verifyAccessToken, authorizeRoles("superadmin"), getAdminById);
router.post("/admins",       verifyAccessToken, authorizeRoles("superadmin"), createAdmin);
router.put("/admins/:id",    verifyAccessToken, authorizeRoles("superadmin"), updateAdmin);
router.delete("/admins/:id", verifyAccessToken, authorizeRoles("superadmin"), deleteAdmin);

export default router;
