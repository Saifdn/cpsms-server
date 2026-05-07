import express from "express";
import {
  getPaymentById,
  getPaymentStatusById,
} from "../controllers/paymentController.js";

const router = express.Router();

router.get("/:id", getPaymentById);
router.get("/:id/status", getPaymentStatusById);


export default router;