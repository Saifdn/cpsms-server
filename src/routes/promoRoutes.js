import express from "express";
import * as promoController from "../controllers/promoController.js";
import { upload } from "../middleware/multer.js";

const router = express.Router();

router.get("/", promoController.getAllPromoAds);
router.post("/", upload.single("image"), promoController.createPromoAd);
router.delete("/:id", promoController.deletePromoAd);

export default router;