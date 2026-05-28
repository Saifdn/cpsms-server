import * as packageService from "../services/packageService.js";

export const getAllPackages = async (req, res, next) => {
  try {
    const data = await packageService.listPackages();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const getPackageById = async (req, res, next) => {
  try {
    const data = await packageService.getPackage(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createPackage = async (req, res, next) => {
  try {
    const data = await packageService.createPackage(req.body);
    res.status(201).json({ success: true, message: "Package created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const updatePackage = async (req, res, next) => {
  try {
    const data = await packageService.updatePackage(req.params.id, req.body);
    res.json({ success: true, message: "Package updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const deletePackage = async (req, res, next) => {
  try {
    await packageService.deletePackage(req.params.id);
    res.json({ success: true, message: "Package deleted permanently" });
  } catch (err) {
    next(err);
  }
};
