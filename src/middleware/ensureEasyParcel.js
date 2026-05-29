import axios from "axios";
import AppConfig from "../models/AppConfig.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import "dotenv/config";

const CLIENT_ID = process.env.EP_CLIENT_ID;
const CLIENT_SECRET = process.env.EP_CLIENT_SECRET;
const REDIRECT_URI = process.env.EP_REDIRECT_URI;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const getBasicAuth = () =>
  Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

const ensureEasyParcel = async (req, res, next) => {
  try {
    const config = await AppConfig.getSingleton();

    // ── Case 1: App not connected ─────────────────────────────
    if (!config.easyparcel.connected || !config.easyparcel.access_token) {
      return res.status(403).json({
        code: "EP_NOT_CONNECTED",
        authUrl: `${BACKEND_URL}/easyparcel/auth/connect?userId=${req.user.userId}&returnTo=${encodeURIComponent(req.get("referer") || "/")}`,
      });
    }

    // ── Case 2: Token still valid ─────────────────────────────
    if (config.isEPTokenValid()) {
      req.epToken = decrypt(config.easyparcel.access_token);
      return next();
    }

    // ── Case 3: Token expired — try refresh ──────────────────
    if (!config.isEPRefreshValid()) {
      await AppConfig.findByIdAndUpdate("singleton", {
        "easyparcel.connected": false,
        "easyparcel.access_token": null,
        "easyparcel.refresh_token": null,
      });

      return res.status(403).json({
        code: "EP_NOT_CONNECTED",
        authUrl: `${BACKEND_URL}/easyparcel/auth/connect?userId=${req.user.userId}&returnTo=${encodeURIComponent(req.get("referer") || "/")}`,
      });
    }

    // Refresh the token silently
    console.log("[EP] Refreshing app-level token");

    const response = await axios.post(
      "https://api.easyparcel.com/oauth/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: decrypt(config.easyparcel.refresh_token),
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          Authorization: `Basic ${getBasicAuth()}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_at, refresh_token_expires_at } =
      response.data;

    await AppConfig.findByIdAndUpdate("singleton", {
      "easyparcel.access_token": encrypt(access_token),
      "easyparcel.refresh_token": encrypt(refresh_token),
      "easyparcel.expires_at": new Date(expires_at),
      "easyparcel.refresh_token_expires_at": new Date(refresh_token_expires_at),
    });

    req.epToken = access_token;
    next();
  } catch (err) {
    console.error("[EP] ensureEasyParcel error:", err.message);
    res.status(500).json({ message: "EasyParcel authentication error" });
  }
};

export default ensureEasyParcel;
