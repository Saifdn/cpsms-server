import * as taskService from "../services/taskService.js";

export const getTasks = async (req, res, next) => {
  try {
    const data = await taskService.getAllTasks();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const getMyTasks = async (req, res, next) => {
  try {
    const data = await taskService.getMyTasks(req.user.userId);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const getTask = async (req, res, next) => {
  try {
    const data = await taskService.getTask(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const data = await taskService.createTask(req.body, req.user.userId);
    res.status(201).json({ success: true, message: "Task created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const data = await taskService.updateTask(req.params.id, req.body);
    res.json({ success: true, message: "Task updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id);
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (err) {
    next(err);
  }
};
