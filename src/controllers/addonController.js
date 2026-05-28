import * as addonService from "../services/addonService.js";

export const getAllAddons = async (req, res, next) => {
  try {
    const data = await addonService.listAddons();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const createAddon = async (req, res, next) => {
  try {
    const data = await addonService.createAddon(req.body);
    res.status(201).json({ success: true, message: "Add-on created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const updateAddon = async (req, res, next) => {
  try {
    const data = await addonService.updateAddon(req.params.id, req.body);
    res.json({ success: true, message: "Add-on updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const deleteAddon = async (req, res, next) => {
  try {
    await addonService.deleteAddon(req.params.id);
    res.json({ success: true, message: "Add-on deleted permanently" });
  } catch (err) {
    next(err);
  }
};
