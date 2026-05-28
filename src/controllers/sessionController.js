import * as sessionService from "../services/sessionService.js";

export const generateSessions = async (req, res, next) => {
  try {
    const { sessions, batchId } = await sessionService.generateSessions(req.body);
    res.status(201).json({
      success: true,
      message: `Successfully generated ${sessions.length} sessions`,
      count: sessions.length,
      batchId,
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllSessions = async (req, res, next) => {
  try {
    const data = await sessionService.listSessions(req.query);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const updateSession = async (req, res, next) => {
  try {
    const data = await sessionService.updateSession(req.params.id, req.body);
    res.json({ success: true, message: "Session updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    await sessionService.deleteSession(req.params.id);
    res.json({ success: true, message: "Session deleted successfully" });
  } catch (err) {
    next(err);
  }
};
