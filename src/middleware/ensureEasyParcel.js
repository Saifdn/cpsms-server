// middleware/ensureEasyParcel.js
//
// Drop this middleware on any route that calls the EasyParcel API.
// It does 3 things:
//   1. If user has no token → return EP_NOT_CONNECTED with an authUrl
//   2. If token is expired but refresh is valid → auto-refresh silently
//   3. If everything is fine → attach req.epToken and call next()
//
// The frontend intercepts EP_NOT_CONNECTED and redirects to authUrl automatically.
// The user never needs to manually connect anything.

import axios from "axios";
import User from "../models/User.js";
import "dotenv/config";

const CLIENT_ID = process.env.EP_CLIENT_ID;
const CLIENT_SECRET = process.env.EP_CLIENT_SECRET;
const REDIRECT_URI = process.env.EP_REDIRECT_URI;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const getBasicAuth = () =>
  Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

const ensureEasyParcel = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    // ── Case 1: No token at all ───────────────────────────────
    if (!user.easyparcel.connected || !user.easyparcel.access_token) {
      return res.status(403).json({
        code: "EP_NOT_CONNECTED",
        // Frontend will redirect here — returnTo brings them back after OAuth
        authUrl: `${process.env.BACKEND_URL}/easyparcel/auth/connect?userId=${req.user.userId}&returnTo=${encodeURIComponent(req.get("referer") || "/")}`,
      });
    }

    // ── Case 2: Token still valid ─────────────────────────────
    if (user.isEPTokenValid()) {
      req.epToken = user.easyparcel.access_token;
      return next();
    }

    // ── Case 3: Token expired — try refresh ──────────────────
    if (!user.isEPRefreshValid()) {
      // Both tokens expired — user must re-authenticate
      await User.findByIdAndUpdate(req.user.userId, {
        "easyparcel.connected": false,
        "easyparcel.access_token": null,
        "easyparcel.refresh_token": null,
      });

      return res.status(403).json({
        code: "EP_NOT_CONNECTED",
        authUrl: `${process.env.BACKEND_URL}/easyparcel/auth/connect?userId=${req.user.userId}&returnTo=${encodeURIComponent(req.get("referer") || "/")}`,
      });
    }

    // Refresh the token silently
    console.log("[EP] Refreshing token for user:", req.user.userId);

    const response = await axios.post(
      "https://api.easyparcel.com/oauth/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.easyparcel.refresh_token,
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

    await User.findByIdAndUpdate(req.user.userId, {
      "easyparcel.access_token": access_token,
      "easyparcel.refresh_token": refresh_token,
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