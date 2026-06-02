import express from "express";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { getEventSummary, getDailyReport } from "../controllers/reportController.js";

const router = express.Router();

router.use(verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"));

router.get("/event-summary", getEventSummary);
router.get("/daily", getDailyReport);

export default router;
