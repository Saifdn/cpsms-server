import * as studioService from "../services/studioService.js";

export const getAllStudios = async (req, res, next) => {
  try {
    const data = await studioService.listStudios();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    next(err);
  }
};

export const getStudioById = async (req, res, next) => {
  try {
    const data = await studioService.getStudio(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createStudio = async (req, res, next) => {
  try {
    const data = await studioService.createStudio(req.body);
    res.status(201).json({ success: true, message: "Studio created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const toggleStudioAvailability = async (req, res, next) => {
  try {
    const data = await studioService.toggleAvailability(req.params.id, req.body.isAvailable);
    res.json({
      success: true,
      message: `Studio is now ${data.isAvailable ? "Available" : "Unavailable"}`,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateStudio = async (req, res, next) => {
  try {
    const data = await studioService.updateStudio(req.params.id, req.body);
    res.json({ success: true, message: "Studio updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const deleteStudio = async (req, res, next) => {
  try {
    await studioService.deleteStudio(req.params.id);
    res.json({ success: true, message: "Studio deleted successfully" });
  } catch (err) {
    next(err);
  }
};
