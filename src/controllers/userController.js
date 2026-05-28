import * as userService from "../services/userService.js";

// ─── Current User ─────────────────────────────────────────────────────────────

export const getMe = async (req, res, next) => {
  try {
    const data = await userService.getUserMe(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const data = await userService.updateUserMe(req.user.userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── Graduate ─────────────────────────────────────────────────────────────────

export const getAllGraduates = async (req, res, next) => {
  try {
    const result = await userService.listGraduates(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getGraduateById = async (req, res, next) => {
  try {
    const data = await userService.getGraduate(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createGraduate = async (req, res, next) => {
  try {
    const data = await userService.createGraduate(req.body);
    res.status(201).json({
      success: true,
      message: "Graduate created successfully. Password has been sent to their email.",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateGraduate = async (req, res, next) => {
  try {
    const data = await userService.updateGraduate(req.params.id, req.body);
    res.json({ success: true, message: "Graduate updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const deleteGraduate = async (req, res, next) => {
  try {
    await userService.deleteGraduate(req.params.id);
    res.json({ success: true, message: "Graduate deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ─── Staff ────────────────────────────────────────────────────────────────────

export const getAllStaff = async (req, res, next) => {
  try {
    const result = await userService.listStaff(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getStaffById = async (req, res, next) => {
  try {
    const data = await userService.getStaff(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createStaff = async (req, res, next) => {
  try {
    const data = await userService.createStaff(req.body);
    res.status(201).json({
      success: true,
      message: "Staff created successfully. Password has been sent to their email.",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateStaff = async (req, res, next) => {
  try {
    const data = await userService.updateStaff(req.params.id, req.body);
    res.json({ success: true, message: "Staff updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const deleteStaff = async (req, res, next) => {
  try {
    await userService.deleteStaff(req.params.id);
    res.json({ success: true, message: "Staff deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const getAllAdmins = async (req, res, next) => {
  try {
    const result = await userService.listAdmins(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getAdminById = async (req, res, next) => {
  try {
    const data = await userService.getAdmin(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    const data = await userService.createAdmin(req.body);
    res.status(201).json({
      success: true,
      message: "Admin created successfully. Password has been sent to their email.",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateAdmin = async (req, res, next) => {
  try {
    const data = await userService.updateAdmin(req.params.id, req.body);
    res.json({ success: true, message: "Admin updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    await userService.deleteAdmin(req.params.id);
    res.json({ success: true, message: "Admin deleted successfully" });
  } catch (err) {
    next(err);
  }
};
