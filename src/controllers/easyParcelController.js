import * as easyParcelService from "../services/easyParcelService.js";

const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5173";

export const startEasyParcelOAuth = (req, res) => {
  const { userId, returnTo } = req.query;

  if (!userId) {
    return res.redirect(`${FRONTEND_URL}/login`);
  }

  const redirectUrl = easyParcelService.buildOAuthRedirectUrl(res, { userId, returnTo });
  res.redirect(redirectUrl);
};

export const handleEasyParcelCallback = async (req, res) => {
  const { redirect } = await easyParcelService.handleOAuthCallback(req, res, req.query);
  res.redirect(redirect);
};

export const getEasyParcelStatus = async (req, res, next) => {
  try {
    const status = await easyParcelService.getEasyParcelStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
};

export const disconnectEasyParcel = async (req, res, next) => {
  try {
    await easyParcelService.disconnectEasyParcel();
    res.json({ message: "EasyParcel disconnected successfully" });
  } catch (err) {
    next(err);
  }
};

export const trackingStatusWebhook = async (req, res, next) => {
  try {
    await easyParcelService.handleTrackingWebhook(req.body);
    res.json({ success: true, message: "Webhook processed successfully" });
  } catch (err) {
    next(err);
  }
};
