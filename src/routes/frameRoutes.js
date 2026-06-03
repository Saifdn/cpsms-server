import express from "express";
import { listFrames, listAllFrames, createFrame, updateFrame, deleteFrame } from "../controllers/frameController.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", listFrames);
router.get("/all", authorizeRoles("superadmin", "admin", "staff"), listAllFrames);
router.post("/", authorizeRoles("superadmin", "admin", "staff"), createFrame);
router.put("/:id", authorizeRoles("superadmin", "admin", "staff"), updateFrame);
router.delete("/:id", authorizeRoles("superadmin", "admin", "staff"), deleteFrame);

export default router;
