import express from "express";
import {
  getAllStudios,
  getStudioById,
  createStudio,
  toggleStudioAvailability,
  updateStudio,
  deleteStudio,
} from "../controllers/studioController.js";

const router = express.Router();

// Studio Routes
router.get("/", getAllStudios);
router.get("/:id", getStudioById);
router.post("/", createStudio);
router.put("/:id/availability", toggleStudioAvailability);
router.put("/:id", updateStudio);
router.delete("/:id", deleteStudio);

export default router;