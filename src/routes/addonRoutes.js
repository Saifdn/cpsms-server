import express from "express";
import * as addonController from "../controllers/addonController.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Any authenticated user can view add-ons
router.get("/", verifyAccessToken, addonController.getAllAddons);

// Staff+ can create, update, delete
router.post("/",    verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), addonController.createAddon);
router.put("/:id",  verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), addonController.updateAddon);
router.delete("/:id", verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), addonController.deleteAddon);

export default router;
