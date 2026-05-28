import axios from "axios";
import User from "../models/User.js";
import Shipment from "../models/Shipment.js";
import Booking from "../models/Booking.js";
import { getShipmentStatus } from "../utils/easyparcelStatus.js";

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

export function buildOAuthRedirectUrl(session, { userId, returnTo }) {
  const state = Math.random().toString(36).substring(2, 15);
  session.oauthState = state;
  session.oauthUserId = userId;
  session.oauthReturnTo = returnTo || "/";

  const params = new URLSearchParams({
    client_id: process.env.EP_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
  });

  return `https://api.easyparcel.com/oauth/login?${params}`;
}

export async function handleOAuthCallback(session, { code, state }) {
  if (!state || state !== session.oauthState) {
    return { redirect: `${FRONTEND_URL}?ep_error=invalid_state` };
  }
  if (!code) {
    return { redirect: `${FRONTEND_URL}?ep_error=no_code` };
  }

  const userId = session.oauthUserId;
  if (!userId) {
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

    await User.findByIdAndUpdate(userId, {
      "easyparcel.access_token": access_token,
      "easyparcel.refresh_token": refresh_token,
      "easyparcel.expires_at": new Date(expires_at),
      "easyparcel.refresh_token_expires_at": new Date(refresh_token_expires_at),
      "easyparcel.connected": true,
      "easyparcel.connected_at": new Date(),
    });

    const returnTo = session.oauthReturnTo || "/shipment-management";
    delete session.oauthState;
    delete session.oauthUserId;
    delete session.oauthReturnTo;

    return { redirect: `${FRONTEND_URL}${returnTo}` };
  } catch (err) {
    console.error("[EasyParcel OAuth Error]", err.response?.data || err.message);
    return { redirect: `${FRONTEND_URL}?ep_error=token_failed` };
  }
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
