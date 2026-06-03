import express from "express";
import {
  getAllFrameOrders,
  getFrameOrderById,
  createFrameOrder,
  adminCreateFrameOrder,
  updateFrameOrder,
  cancelFrameOrder,
  getMyFrameOrders,
  getMyFrameOrderById,
} from "../controllers/frameOrderController.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyAccessToken);

router.get("/", authorizeRoles("superadmin", "admin", "staff"), getAllFrameOrders);
router.get("/my-orders", getMyFrameOrders);
router.get("/my-orders/:id", getMyFrameOrderById);
router.get("/:id", authorizeRoles("superadmin", "admin", "staff"), getFrameOrderById);
router.post("/admin", authorizeRoles("superadmin", "admin", "staff"), adminCreateFrameOrder);
router.post("/", createFrameOrder);
router.put("/:id", authorizeRoles("superadmin", "admin", "staff"), updateFrameOrder);
router.put("/:id/cancel", cancelFrameOrder);

export default router;
