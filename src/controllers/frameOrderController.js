import * as frameOrderService from "../services/frameOrderService.js";

export const getMyFrameOrders = async (req, res, next) => {
  try {
    const data = await frameOrderService.getMyFrameOrders(req.user.userId, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMyFrameOrderById = async (req, res, next) => {
  try {
    const data = await frameOrderService.getMyFrameOrderById(req.user.userId, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getAllFrameOrders = async (req, res, next) => {
  try {
    const result = await frameOrderService.getAllFrameOrders(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getFrameOrderById = async (req, res, next) => {
  try {
    const data = await frameOrderService.getFrameOrderById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createFrameOrder = async (req, res, next) => {
  try {
    const result = await frameOrderService.createFrameOrder(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "Frame order created. Redirecting to payment...",
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const adminCreateFrameOrder = async (req, res, next) => {
  try {
    const data = await frameOrderService.adminCreateFrameOrder(req.body);
    res.status(201).json({
      success: true,
      message: "Frame order created and payment recorded successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateFrameOrder = async (req, res, next) => {
  try {
    const data = await frameOrderService.updateFrameOrder(req.params.id, req.body);
    res.json({ success: true, message: "Frame order updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const cancelFrameOrder = async (req, res, next) => {
  try {
    await frameOrderService.cancelFrameOrder(req.params.id);
    res.json({ success: true, message: "Frame order cancelled successfully" });
  } catch (err) {
    next(err);
  }
};
