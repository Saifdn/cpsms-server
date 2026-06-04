import axios from "axios";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import FrameOrder from "../models/FrameOrder.js";
import Session from "../models/Session.js";
import Payment from "../models/Payment.js";
import Graduate from "../models/Graduate.js";
import Package from "../models/Package.js";
import Addon from "../models/Addon.js";
import Shipment from "../models/Shipment.js";
import Queue from "../models/Queue.js";
import { sendBookingConfirmation } from "../utils/sendBookingEmail.js";
import { broadcastQueueUpdate } from "../config/socket.js";
import { applyFrameOrderPaymentResult } from "./frameOrderService.js";

const BILLPLZ_API_URL = process.env.BILLPLZ_API_URL || "https://www.billplz-sandbox.com/api/v3";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound(message = "Booking not found") {
  const err = new Error(message);
  err.statusCode = 404;
  err.isOperational = true;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.isOperational = true;
  return err;
}

function toTitleCase(str) {
  return str.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeReceiver(receiver) {
  if (!receiver) return receiver;
  const out = { ...receiver };
  if (out.name) out.name = toTitleCase(out.name);
  if (out.email) out.email = out.email.trim().toLowerCase();
  if (out.address_1) out.address_1 = toTitleCase(out.address_1);
  if (out.address_2) out.address_2 = toTitleCase(out.address_2);
  if (out.city) out.city = toTitleCase(out.city);
  
  return out;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Only status and notes are safe to update manually.
// paymentStatus and totalPrice are managed by the payment flow.
const BOOKING_UPDATE_FIELDS = ["status", "notes"];

// ─── Billplz signature verification ──────────────────────────────────────────

function verifyBillplzSignature(payload, xSignature, secretKey) {
  const data = { ...payload };
  delete data.x_signature;

  const sourceString = Object.keys(data)
    .map((key) => `${key}${data[key] ?? ""}`)
    .sort()
    .join("|");

  const generatedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(sourceString)
    .digest("hex");

  return generatedSignature === xSignature;
}

async function fetchBillplzBillStatus(billId) {
  const response = await axios.get(
    `${BILLPLZ_API_URL}/bills/${billId}`,
    { auth: { username: process.env.BILLPLZ_API_KEY, password: "" } }
  );
  return response.data;
}

// ─── Graduate-scoped queries ──────────────────────────────────────────────────

export async function getMyBookings(userId, { status } = {}) {
  const query = { graduate: userId };
  if (status) query.status = status;

  return Booking.find(query)
    .populate("package", "name services price")
    .populate("addons", "name price")
    .populate("session", "date startTime endTime")
    .select("package addons session paymentStatus status bookedAt bookingNumber")
    .sort({ createdAt: -1 })
    .lean();
}

export async function getMyBookingById(userId, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, graduate: userId })
    .populate("package", "name services price")
    .populate("addons", "name price")
    .populate("session", "date startTime endTime")
    .populate("shipment", "latest_shipment_status_code latest_tracking_status status_log")
    .select("paymentStatus status bookedAt bookingNumber totalPrice")
    .lean();

  if (!booking) throw notFound("Booking not found or you don't have access to this booking");
  return booking;
}

// ─── Admin queries ────────────────────────────────────────────────────────────

export async function getAllBookings({ status, graduate, date, search, page = 1, limit = 20 }) {
  const filter = {};
  if (status) filter.status = status;
  if (graduate) filter.graduate = graduate;

  if (search) {
    const escaped = escapeRegex(search);
    const matchingGraduates = await Graduate.find({
      $or: [
        { fullName: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ],
    }).select("_id").lean();

    filter.$or = [
      { bookingNumber: { $regex: escaped, $options: "i" } },
      { graduate: { $in: matchingGraduates.map((g) => g._id) } },
    ];
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const sessions = await Session.find({ date: { $gte: start, $lte: end } }).select("_id").lean();
    if (sessions.length === 0) {
      return { data: [], count: 0, pagination: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 } };
    }
    filter.session = { $in: sessions.map((s) => s._id) };
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const [total, bookings] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .populate("graduate", "fullName email phone")
      .populate("package", "name price")
      .populate("session", "date startTime endTime")
      .populate("addons", "name price")
      .sort({ bookedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  return {
    data: bookings,
    count: bookings.length,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function getBookingById(id) {
  const booking = await Booking.findById(id)
    .populate("graduate", "fullName email phone")
    .populate("package", "name price")
    .populate("session", "date startTime endTime")
    .populate("studio", "name location")
    .lean();

  if (!booking) throw notFound();
  return booking;
}

export async function getBookingByNumber(bookingNumber) {
  const booking = await Booking.findOne({ bookingNumber })
    .populate("graduate", "fullName email phone")
    .populate("package", "name price")
    .populate("addons", "name price")
    .populate("session", "date startTime endTime")
    .select("bookingNumber status totalPrice bookedAt")
    .lean();

  if (!booking) throw notFound(`Booking with number ${bookingNumber} not found`);
  return booking;
}

// ─── Write operations ─────────────────────────────────────────────────────────

export async function createBooking({ graduate: graduateId, package: packageId, session: sessionId, addons = [], shipment: shipmentData }, user) {
  const [session, packageData] = await Promise.all([
    Session.findById(sessionId),
    Package.findById(packageId),
  ]);

  if (!session) throw notFound("Session not found");
  if (session.bookedCount >= session.capacity) throw badRequest("Session is fully booked");
  if (!packageData) throw notFound("Package not found");

  let totalAmount = packageData.price;
  if (addons.length > 0) {
    const addonData = await Addon.find({ _id: { $in: addons } }).lean();
    totalAmount += addonData.reduce((sum, a) => sum + a.price, 0);
  }

  const booking = await Booking.create({ graduate: graduateId, package: packageId, session: sessionId, addons });

  const payment = await Payment.create({
    booking: booking._id,
    amount: totalAmount,
    gateway: "billplz",
    paymentStatus: "pending",
  });

  if (shipmentData) {
    const shipment = await Shipment.create({ booking: booking._id, receiver: normalizeReceiver(shipmentData.receiver) });
    booking.shipment = shipment._id;
    await booking.save();
  }

  const billplzResponse = await axios.post(
    `${BILLPLZ_API_URL}/bills`,
    {
      collection_id: process.env.BILLPLZ_COLLECTION_ID,
      email: user.email,
      mobile: user.phone,
      name: user.fullName,
      amount: totalAmount * 100,
      description: `Booking #${booking.bookingNumber}`,
      callback_url: process.env.BILLPLZ_CALLBACK_URL,
      redirect_url: process.env.BILLPLZ_REDIRECT_URL,
      reference_1_label: "Booking ID",
      reference_1: booking.bookingNumber,
    },
    { auth: { username: process.env.BILLPLZ_API_KEY, password: "" } }
  );

  payment.paymentUrl = billplzResponse.data.url;
  payment.gatewayTransactionId = billplzResponse.data.id;
  await payment.save();

  return { paymentUrl: billplzResponse.data.url, bookingId: booking._id };
}

export async function adminCreateBooking({ graduate: graduateId, package: packageId, session: sessionId, addons = [], paymentMethod, shipment: shipmentData }) {
  if (!["cash", "qr"].includes(paymentMethod)) {
    throw badRequest("paymentMethod must be 'cash' or 'qr'");
  }

  const [packageData, session] = await Promise.all([
    Package.findById(packageId),
    Session.findById(sessionId),
  ]);

  if (!packageData) throw notFound("Package not found");
  if (!session) throw notFound("Session not found");
  if (session.bookedCount >= session.capacity) throw badRequest("Session is fully booked");

  let totalAmount = packageData.price;
  if (addons.length > 0) {
    const addonData = await Addon.find({ _id: { $in: addons } }).lean();
    totalAmount += addonData.reduce((sum, a) => sum + a.price, 0);
  }

  const booking = await Booking.create({
    graduate: graduateId,
    package: packageId,
    session: sessionId,
    addons,
    status: "booked",
    paymentStatus: "paid",
    totalPrice: totalAmount,
  });

  await Payment.create({
    booking: booking._id,
    amount: totalAmount,
    paidAmount: totalAmount,
    gateway: paymentMethod,
    paymentStatus: "paid",
  });

  if (shipmentData) {
    const shipment = await Shipment.create({ booking: booking._id, receiver: normalizeReceiver(shipmentData.receiver) });
    booking.shipment = shipment._id;
    await booking.save();
  }

  session.bookedCount += 1;
  session.status = session.bookedCount >= session.capacity ? "full" : "available";
  await session.save();

  await booking.populate([
    { path: "graduate", select: "fullName email phone" },
    { path: "package", select: "name price services" },
    { path: "session", select: "date startTime endTime" },
    { path: "addons", select: "name price" },
  ]);

  sendBookingConfirmation(booking).catch((err) =>
    console.error("sendBookingConfirmation failed:", err)
  );

  return booking;
}

export async function updateBooking(id, body) {
  const allowed = {};
  for (const key of BOOKING_UPDATE_FIELDS) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const booking = await Booking.findByIdAndUpdate(id, allowed, { new: true, runValidators: true })
    .populate("graduate package session studio")
    .lean();

  if (!booking) throw notFound();
  return booking;
}

export async function cancelBooking(id) {
  const booking = await Booking.findById(id);
  if (!booking) throw notFound();
  if (booking.status === "cancelled") throw badRequest("Booking is already cancelled");

  const nonCancellable = ["checked-in", "in-progress", "completed", "preparing", "delivery"];
  if (nonCancellable.includes(booking.status)) {
    throw badRequest(`Cannot cancel a booking with status "${booking.status}"`);
  }

  booking.status = "cancelled";
  await booking.save();

  // Only decrement session count if booking was paid (and thus counted)
  if (booking.paymentStatus === "paid") {
    const session = await Session.findById(booking.session);
    if (session && session.bookedCount > 0) {
      session.bookedCount -= 1;
      session.status = session.bookedCount >= session.capacity ? "full" : "available";
      await session.save();
    }
  }

  if (booking.queue) {
    const queue = await Queue.findById(booking.queue);
    if (queue && !["completed", "cancelled"].includes(queue.status)) {
      queue.status = "cancelled";
      await queue.save();
      broadcastQueueUpdate();
    }
  }
}

// ─── Billplz webhook ──────────────────────────────────────────────────────────

async function applyPaymentResult(payment, booking, isPaid, paidAmountCents) {
  const wasAlreadyPaid = payment.paymentStatus === "paid" || booking.paymentStatus === "paid";

  payment.paidAmount = paidAmountCents ? paidAmountCents / 100 : 0;
  payment.paymentStatus = isPaid ? "paid" : "failed";
  if (isPaid) payment.paidAt = new Date();
  await payment.save();

  if (isPaid) {
    booking.status = "booked";
    booking.paymentStatus = "paid";
    booking.totalPrice = payment.paidAmount;
    if (!wasAlreadyPaid) {
      const session = await Session.findById(booking.session);
      if (session) {
        session.bookedCount += 1;
        session.status = session.bookedCount >= session.capacity ? "full" : "available";
        await session.save();
      }
    }
    sendBookingConfirmation(booking).catch((err) =>
      console.error("sendBookingConfirmation failed:", err)
    );
  } else {
    booking.status = "cancelled";
    booking.paymentStatus = "failed";
  }

  await booking.save();
  console.log(`[payment] Booking ${booking.bookingNumber} → ${payment.paymentStatus}`);
}

export async function handleBillplzCallback(body) {
  const { id, paid_amount, paid, x_signature } = body;

  if (!verifyBillplzSignature(body, x_signature, process.env.BILLPLZ_X_SIGNATURE)) {
    throw badRequest("Invalid signature");
  }
  if (!id) throw badRequest("No bill id provided");

  const payment = await Payment.findOne({ gatewayTransactionId: id });
  if (!payment) throw notFound("Payment not found");

  const isPaid = paid === "true";
  const paidAmount = paid_amount ? Number(paid_amount) : 0;

  if (payment.frameOrder) {
    const order = await FrameOrder.findById(payment.frameOrder);
    if (!order) throw notFound("Frame order not found");
    await applyFrameOrderPaymentResult(payment, order, isPaid, paidAmount);
    return;
  }

  const booking = await Booking.findById(payment.booking)
    .populate("graduate", "fullName email phone")
    .populate("package", "name price services")
    .populate("addons", "name price");
  if (!booking) throw notFound();

  await applyPaymentResult(payment, booking, isPaid, paidAmount);
}

export async function reconcilePaymentById(paymentDoc) {
  if (paymentDoc.paymentStatus !== "pending" || !paymentDoc.gatewayTransactionId) return false;

  const isFrameOrderPayment = !!paymentDoc.frameOrder;

  let billData;
  try {
    billData = await fetchBillplzBillStatus(paymentDoc.gatewayTransactionId);
  } catch (err) {
    if (err.response?.status === 404) {
      const payment = paymentDoc.save ? paymentDoc : await Payment.findById(paymentDoc._id);
      if (isFrameOrderPayment) {
        const order = await FrameOrder.findById(payment.frameOrder);
        if (payment && order) {
          await applyFrameOrderPaymentResult(payment, order, false, 0);
          return true;
        }
      } else {
        const booking = await Booking.findById(payment.booking)
          .populate("graduate", "fullName email phone")
          .populate("package", "name price services")
          .populate("addons", "name price");
        if (payment && booking) {
          await applyPaymentResult(payment, booking, false, 0);
          return true;
        }
      }
    }
    console.error(`[reconcile] Billplz API error for bill ${paymentDoc.gatewayTransactionId}:`, err.message);
    return false;
  }

  const payment = paymentDoc.save ? paymentDoc : await Payment.findById(paymentDoc._id);
  const isPaid = billData.paid === true;
  const paidAmount = billData.paid_amount ? Number(billData.paid_amount) : 0;

  if (isFrameOrderPayment) {
    const order = await FrameOrder.findById(payment.frameOrder);
    if (!payment || !order) return false;
    await applyFrameOrderPaymentResult(payment, order, isPaid, paidAmount);
  } else {
    const booking = await Booking.findById(payment.booking)
      .populate("graduate", "fullName email phone")
      .populate("package", "name price services")
      .populate("addons", "name price");
    if (!payment || !booking) return false;
    await applyPaymentResult(payment, booking, isPaid, paidAmount);
  }

  return true;
}
