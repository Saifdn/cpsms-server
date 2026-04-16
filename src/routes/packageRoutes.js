import express from "express";
import {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
} from "../controllers/packageController.js";

const router = express.Router();

// Public routes (for customers to see active packages)
router.get("/", getAllPackages);

// Admin routes
router.post("/", createPackage);                    // Create new package
router.get("/:id", getPackageById);                 // Get single package
router.put("/:id", updatePackage);                  // Update package
router.delete("/:id", deletePackage);               // Soft delete (deactivate)

export default router;