import axios from "axios";
import User from "../models/User.js";
import "dotenv/config";

const CLIENT_ID = process.env.EP_CLIENT_ID;
const CLIENT_SECRET = process.env.EP_CLIENT_SECRET;
const REDIRECT_URI = process.env.EP_REDIRECT_URI;
const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5173";

const getBasicAuth = () =>
  Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");


// ─────────────────────────────
// START OAUTH
// ─────────────────────────────
export const startEasyParcelOAuth = (req, res) => {
  const { userId, returnTo } = req.query;

  if (!userId) {
    return res.redirect(`${process.env.FRONTEND_URL}/login`);
  }

  const state = Math.random().toString(36).substring(2, 15);

  req.session.oauthState = state;
  req.session.oauthUserId = userId;
  req.session.oauthReturnTo = returnTo || "/";

  const params = new URLSearchParams({
    client_id: process.env.EP_CLIENT_ID,
    redirect_uri: process.env.EP_REDIRECT_URI,
    state,
  });

  res.redirect(`https://api.easyparcel.com/oauth/login?${params}`);
};

// ─────────────────────────────
// CALLBACK
// ─────────────────────────────
export const handleEasyParcelCallback = async (req, res) => {
  const { code, state } = req.query;

  const FRONTEND_URL =
    process.env.CLIENT_URL || "http://localhost:5173";

  // Validate state
  if (!state || state !== req.session.oauthState) {
    return res.redirect(`${FRONTEND_URL}?ep_error=invalid_state`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}?ep_error=no_code`);
  }

  const userId = req.session.oauthUserId;

  if (!userId) {
    return res.redirect(`${FRONTEND_URL}/login?ep_error=session_expired`);
  }

  try {
    const response = await axios.post(
      "https://api.easyparcel.com/oauth/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
      }),
      {
        headers: {
          Authorization: `Basic ${getBasicAuth()}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const {
      access_token,
      refresh_token,
      expires_at,
      refresh_token_expires_at,
    } = response.data;

    await User.findByIdAndUpdate(userId, {
      "easyparcel.access_token": access_token,
      "easyparcel.refresh_token": refresh_token,
      "easyparcel.expires_at": new Date(expires_at),
      "easyparcel.refresh_token_expires_at":
        new Date(refresh_token_expires_at),
      "easyparcel.connected": true,
      "easyparcel.connected_at": new Date(),
    });

    console.log("[EasyParcel] Connected:", userId);

    // cleanup session
    const returnTo = req.session.oauthReturnTo || "/shipment-management";

    delete req.session.oauthState;
    delete req.session.oauthUserId;
    delete req.session.oauthReturnTo;

    res.redirect(`${FRONTEND_URL}${returnTo}`);
  } catch (err) {
    console.error(
      "[EasyParcel OAuth Error]",
      err.response?.data || err.message
    );

    res.redirect(`${FRONTEND_URL}?ep_error=token_failed`);
  }
};