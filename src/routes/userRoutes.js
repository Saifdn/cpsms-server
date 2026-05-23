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
import { verifyAccessToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", verifyAccessToken, getMe);         // GET authenticated user's own profile
router.patch("/me", verifyAccessToken, updateMe);    // UPDATE authenticated user's own profile

router.get("/graduates", getAllGraduates);           // GET all graduates
router.get("/graduates/:id", getGraduateById);       // GET one graduate
router.post("/graduates", createGraduate);           // CREATE graduate
router.put("/graduates/:id", updateGraduate);        // UPDATE graduate
router.delete("/graduates/:id", deleteGraduate);     // DELETE graduate

router.get("/staff", getAllStaff);           // GET all staff
router.get("/staff/:id", getStaffById);       // GET one staff
router.post("/staff", createStaff);           // CREATE staff
router.put("/staff/:id", updateStaff);        // UPDATE staff
router.delete("/staff/:id", deleteStaff);     // DELETE staff

router.get("/admins", getAllAdmins);           // GET all admins
router.get("/admins/:id", getAdminById);       // GET one admin
router.post("/admins", createAdmin);           // CREATE admin
router.put("/admins/:id", updateAdmin);        // UPDATE admin
router.delete("/admins/:id", deleteAdmin);     // DELETE admin

export default router;