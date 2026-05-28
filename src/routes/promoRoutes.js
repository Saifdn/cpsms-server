import express from "express";
import * as promoController from "../controllers/promoController.js";
import { upload } from "../middleware/multer.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Any authenticated user can view promo ads
router.get("/", verifyAccessToken, promoController.getAllPromoAds);

// Staff+ can create, update, delete
router.post("/",    verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), upload.single("image"), promoController.createPromoAd);
router.put("/:id",  verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), upload.single("image"), promoController.updatePromoAd);
router.delete("/:id", verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), promoController.deletePromoAd);

export default router;
