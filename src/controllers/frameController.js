import * as frameService from "../services/frameService.js";

export const listFrames = async (req, res, next) => {
  try {
    const data = await frameService.listFrames();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const listAllFrames = async (req, res, next) => {
  try {
    const data = await frameService.listAllFrames();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createFrame = async (req, res, next) => {
  try {
    const data = await frameService.createFrame(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateFrame = async (req, res, next) => {
  try {
    const data = await frameService.updateFrame(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteFrame = async (req, res, next) => {
  try {
    await frameService.deleteFrame(req.params.id);
    res.json({ success: true, message: "Frame deleted successfully" });
  } catch (err) {
    next(err);
  }
};
