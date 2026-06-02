import * as reportService from "../services/reportService.js";

export const getEventSummary = async (req, res, next) => {
  try {
    const data = await reportService.getEventSummary(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getDailyReport = async (req, res, next) => {
  try {
    const data = await reportService.getDailyReport(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
