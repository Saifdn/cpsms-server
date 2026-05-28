import * as dashboardService from "../services/dashboardService.js";

export const getDashboardOverview = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardOverview(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
