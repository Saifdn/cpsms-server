import express from "express";
import {
  getPaymentById,
  getPaymentStatusById,
} from "../controllers/paymentController.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Any authenticated user can check payment status (needed after Billplz redirect)
router.get("/:id/status", verifyAccessToken, getPaymentStatusById);

// Staff+ can look up a payment record by its internal ID
router.get("/:id", verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"), getPaymentById);

export default router;
