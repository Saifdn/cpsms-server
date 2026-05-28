import Task from "../models/Task.js";
import User from "../models/User.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound() {
  const err = new Error("Task not found");
  err.statusCode = 404;
  err.isOperational = true;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.isOperational = true;
  return err;
}

function forbidden(message = "Access denied") {
  const err = new Error(message);
  err.statusCode = 403;
  err.isOperational = true;
  return err;
}

// Validates that all IDs in assignedTo belong to active staff members.
// Shared between create and update to avoid duplication.
async function validateStaffAssignees(assignedTo) {
  if (!Array.isArray(assignedTo) || assignedTo.length === 0) {
    throw badRequest("At least one staff must be assigned");
  }
  const staffMembers = await User.find({ _id: { $in: assignedTo }, role: "staff" }).lean();
  if (staffMembers.length !== assignedTo.length) {
    throw badRequest("One or more assigned users are not valid staff members");
  }
}

const POPULATE = [
  { path: "assignedTo", select: "fullName email" },
  { path: "assignedBy", select: "fullName" },
];

// ─── Task Service ─────────────────────────────────────────────────────────────

export async function getAllTasks() {
  return Task.find().sort({ createdAt: -1 }).populate(POPULATE).lean();
}

export async function getMyTasks(userId) {
  return Task.find({ assignedTo: userId })
    .sort({ createdAt: -1 })
    .populate("assignedBy", "fullName")
    .lean();
}

export async function getTask(taskId, user) {
  const task = await Task.findById(taskId).populate(POPULATE).lean();
  if (!task) throw notFound();

  // Staff can only view tasks assigned to them
  if (user.role === "staff") {
    const isAssigned = task.assignedTo.some((u) => u._id.toString() === user.userId);
    if (!isAssigned) throw forbidden();
  }

  return task;
}

export async function createTask({ title, description, category, assignedTo }, assignedBy) {
  if (!title) throw badRequest("title is required");
  await validateStaffAssignees(assignedTo);

  const task = await Task.create({ title, description, category, assignedTo, assignedBy });
  await task.populate(POPULATE);
  return task;
}

export async function updateTask(taskId, { title, description, category, assignedTo }) {
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (category !== undefined) updates.category = category;

  if (assignedTo !== undefined) {
    await validateStaffAssignees(assignedTo);
    updates.assignedTo = assignedTo;
  }

  const task = await Task.findByIdAndUpdate(taskId, updates, { new: true, runValidators: true })
    .populate(POPULATE)
    .lean();

  if (!task) throw notFound();
  return task;
}

export async function deleteTask(taskId) {
  const task = await Task.findByIdAndDelete(taskId);
  if (!task) throw notFound();
}
