import Addon from "../models/Addon.js";

export const getAllAddons = async (req, res) => {
  try {
    const addons = await Addon.find().sort({ price: 1 });
    res.json({ success: true, count: addons.length, data: addons });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createAddon = async (req, res) => {
  try {
    const addon = await Addon.create(req.body);
    res.status(201).json({ success: true, message: "Add-on created successfully", data: addon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateAddon = async (req, res) => {
  try {
    const addon = await Addon.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after", runValidators: true });
    if (!addon) return res.status(404).json({ success: false, message: "Add-on not found" });
    res.json({ success: true, message: "Add-on updated successfully", data: addon });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteAddon = async (req, res) => {
  try {
    const addon = await Addon.findByIdAndDelete(req.params.id);

    if (!addon) {
      return res.status(404).json({ 
        success: false, 
        message: "Add-on not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Add-on deleted permanently" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};