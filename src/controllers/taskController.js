import Task from "../models/Task.js";
import User from "../models/User.js";

export const createTask = async (req, res) => {
  try {
    const { title, description, category, assignedTo } = req.body;

    if (!assignedTo || !Array.isArray(assignedTo) || assignedTo.length === 0) {
      return res.status(400).json({ success: false, message: "At least one staff must be assigned." });
    }

    const staffMembers = await User.find({ _id: { $in: assignedTo }, role: "staff" }).lean();
    if (staffMembers.length !== assignedTo.length) {
      return res.status(400).json({ success: false, message: "One or more assigned users are not valid staff members." });
    }

    const task = await Task.create({
      title,
      description,
      category,
      assignedTo,
      assignedBy: req.user.userId,
    });

    await task.populate("assignedTo", "fullName email");
    await task.populate("assignedBy", "fullName");

    res.status(201).json({ success: true, message: "Task created successfully.", data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
      .sort({ createdAt: -1 })
      .populate("assignedTo", "fullName email")
      .populate("assignedBy", "fullName")
      .lean();

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.userId })
      .sort({ createdAt: -1 })
      .populate("assignedBy", "fullName")
      .lean();

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "fullName email")
      .populate("assignedBy", "fullName")
      .lean();

    if (!task) return res.status(404).json({ success: false, message: "Task not found." });

    const isStaff = req.user.role === "staff";
    const isAssigned = task.assignedTo.some((u) => u._id.toString() === req.user.userId);
    if (isStaff && !isAssigned) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { title, description, category, assignedTo } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;

    if (assignedTo !== undefined) {
      if (!Array.isArray(assignedTo) || assignedTo.length === 0) {
        return res.status(400).json({ success: false, message: "At least one staff must be assigned." });
      }
      const staffMembers = await User.find({ _id: { $in: assignedTo }, role: "staff" }).lean();
      if (staffMembers.length !== assignedTo.length) {
        return res.status(400).json({ success: false, message: "One or more assigned users are not valid staff members." });
      }
      updates.assignedTo = assignedTo;
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate("assignedTo", "fullName email")
      .populate("assignedBy", "fullName");

    if (!task) return res.status(404).json({ success: false, message: "Task not found." });

    res.json({ success: true, message: "Task updated successfully.", data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });
    res.json({ success: true, message: "Task deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
