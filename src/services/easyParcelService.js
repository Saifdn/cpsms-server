import axios from "axios";
import AppConfig from "../models/AppConfig.js";
import Shipment from "../models/Shipment.js";
import Booking from "../models/Booking.js";
import { getShipmentStatus } from "../utils/easyparcelStatus.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import { logger } from "../utils/logger.js";
import "dotenv/config";

const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:5173";
const REDIRECT_URI = process.env.EP_REDIRECT_URI;

function getBasicAuth() {
  return Buffer.from(`${process.env.EP_CLIENT_ID}:${process.env.EP_CLIENT_SECRET}`).toString("base64");
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.isOperational = true;
  return err;
}

function notFound(message = "Not found") {
  const err = new Error(message);
  err.statusCode = 404;
  err.isOperational = true;
  return err;
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  signed: true,
  maxAge: 1000 * 60 * 10, // 10 minutes
};

export function buildOAuthRedirectUrl(res, { userId, returnTo }) {
  const state = Math.random().toString(36).substring(2, 15);
  res.cookie("ep_oauth_state", state, OAUTH_COOKIE_OPTIONS);
  res.cookie("ep_oauth_user", userId, OAUTH_COOKIE_OPTIONS);
  res.cookie("ep_oauth_return", returnTo || "/", OAUTH_COOKIE_OPTIONS);

  const params = new URLSearchParams({
    client_id: process.env.EP_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
  });

  return `https://api.easyparcel.com/oauth/login?${params}`;
}

export async function handleOAuthCallback(req, res, { code, state }) {
  const cookies = req.signedCookies || {};
  const clearOAuthCookies = () => {
    res.clearCookie("ep_oauth_state", OAUTH_COOKIE_OPTIONS);
    res.clearCookie("ep_oauth_user", OAUTH_COOKIE_OPTIONS);
    res.clearCookie("ep_oauth_return", OAUTH_COOKIE_OPTIONS);
  };

  if (!state || state !== cookies.ep_oauth_state) {
    logger.warn("[EasyParcel OAuth] state mismatch", {
      receivedState: state,
      cookieState: cookies.ep_oauth_state,
    });
    clearOAuthCookies();
    return { redirect: `${FRONTEND_URL}?ep_error=invalid_state` };
  }
  if (!code) {
    logger.warn("[EasyParcel OAuth] missing code");
    clearOAuthCookies();
    return { redirect: `${FRONTEND_URL}?ep_error=no_code` };
  }

  const userId = cookies.ep_oauth_user;
  if (!userId) {
    logger.warn("[EasyParcel OAuth] session expired — no oauthUserId");
    clearOAuthCookies();
    return { redirect: `${FRONTEND_URL}/login?ep_error=session_expired` };
  }

  try {
    const response = await axios.post(
      "https://api.easyparcel.com/oauth/token",
      new URLSearchParams({ grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code }),
      {
        headers: {
          Authorization: `Basic ${getBasicAuth()}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_at, refresh_token_expires_at } = response.data;

    await AppConfig.findByIdAndUpdate(
      "singleton",
      {
        "easyparcel.access_token": encrypt(access_token),
        "easyparcel.refresh_token": encrypt(refresh_token),
        "easyparcel.expires_at": new Date(expires_at),
        "easyparcel.refresh_token_expires_at": new Date(refresh_token_expires_at),
        "easyparcel.connected": true,
        "easyparcel.connected_at": new Date(),
        "easyparcel.connected_by": userId,
      },
      { upsert: true }
    );

    const returnTo = cookies.ep_oauth_return || "/shipment-management";
    clearOAuthCookies();

    return { redirect: `${FRONTEND_URL}${returnTo}` };
  } catch (err) {
    logger.error("[EasyParcel OAuth] token exchange failed", {
      error: err.response?.data || err.message,
    });
    clearOAuthCookies();
    return { redirect: `${FRONTEND_URL}?ep_error=token_failed` };
  }
}

export async function disconnectEasyParcel() {
  await AppConfig.findByIdAndUpdate("singleton", {
    "easyparcel.access_token": null,
    "easyparcel.refresh_token": null,
    "easyparcel.expires_at": null,
    "easyparcel.refresh_token_expires_at": null,
    "easyparcel.connected": false,
    "easyparcel.connected_at": null,
    "easyparcel.connected_by": null,
  });
}

export async function getEasyParcelStatus() {
  const config = await AppConfig.getSingleton();
  const ep = config.easyparcel;
  // Never expose raw or decrypted tokens to the client
  return {
    connected: ep.connected,
    connected_at: ep.connected_at,
    connected_by: ep.connected_by,
    token_expires_at: ep.expires_at,
    refresh_token_expires_at: ep.refresh_token_expires_at,
  };
}

// ─── Tracking webhook ─────────────────────────────────────────────────────────

export async function handleTrackingWebhook(payload) {
  if (payload.topic !== "shipment.tracking.update") {
    throw badRequest("Unsupported topic");
  }

  const { shipment_number, latest_shipment_status_code, latest_tracking_status, status_log } = payload;

  if (!shipment_number) throw badRequest("shipment_number is required");

  const shipment = await Shipment.findOne({ shipment_number });
  if (!shipment) throw notFound("Shipment not found");

  // Normalise status_log — EP can send either an array or an object
  let normalizedStatusLog = [];
  if (Array.isArray(status_log)) {
    normalizedStatusLog = status_log;
  } else if (status_log && typeof status_log === "object") {
    normalizedStatusLog = Object.values(status_log);
  }

  shipment.latest_shipment_status_code = latest_shipment_status_code;
  shipment.latest_tracking_status = latest_tracking_status;
  shipment.status_log = normalizedStatusLog;

  const { status: shipmentStatus } = getShipmentStatus(latest_shipment_status_code);
  shipment.status = shipmentStatus;
  await shipment.save();

  // Map shipment status to valid Booking schema enum values:
  // "delivered" → "completed" (final state), anything else in transit → "delivery"
  const bookingStatus = shipmentStatus === "delivered" ? "completed" : "delivery";
  await Booking.findByIdAndUpdate(shipment.booking, { status: bookingStatus });
}
