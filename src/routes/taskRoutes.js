import express from "express";
import * as taskController from "../controllers/taskController.js";
import { verifyAccessToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyAccessToken);

router.get("/my", taskController.getMyTasks);

router.get("/", authorizeRoles("admin", "superadmin"), taskController.getTasks);
router.post("/", authorizeRoles("admin", "superadmin"), taskController.createTask);
router.get("/:id", taskController.getTask);
router.put("/:id", authorizeRoles("admin", "superadmin"), taskController.updateTask);
router.delete("/:id", authorizeRoles("admin", "superadmin"), taskController.deleteTask);

export default router;
