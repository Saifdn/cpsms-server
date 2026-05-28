import express from "express";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";
import { getDashboardOverview } from "../controllers/dashboardController.js";

const router = express.Router();

router.use(verifyAccessToken, authorizeRoles("staff", "admin", "superadmin"));

router.get("/overview", getDashboardOverview);

export default router;
