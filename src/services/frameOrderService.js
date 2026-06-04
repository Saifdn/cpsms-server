import axios from "axios";
import FrameOrder from "../models/FrameOrder.js";
import Payment from "../models/Payment.js";
import Shipment from "../models/Shipment.js";
import Frame from "../models/Frame.js";
import Graduate from "../models/Graduate.js";
import { sendFrameOrderConfirmation } from "../utils/sendFrameOrderEmail.js";

const BILLPLZ_API_URL = process.env.BILLPLZ_API_URL || "https://www.billplz-sandbox.com/api/v3";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound(message = "Frame order not found") {
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

const FRAME_ORDER_UPDATE_FIELDS = ["status", "notes"];

// ─── Item validation and price calculation ────────────────────────────────────

async function resolveItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw badRequest("At least one item is required");
  }

  const frameIds = rawItems.map((i) => i.frame);
  const frameDocs = await Frame.find({ _id: { $in: frameIds }, isActive: true }).lean();
  const frameMap = Object.fromEntries(frameDocs.map((f) => [String(f._id), f]));

  let totalAmount = 0;
  const items = rawItems.map((i) => {
    const frame = frameMap[String(i.frame)];
    if (!frame) throw notFound(`Frame ${i.frame} not found or is no longer available`);
    const qty = Number(i.quantity);
    if (!qty || qty < 1) throw badRequest(`Invalid quantity for frame ${frame.name}`);
    totalAmount += frame.price * qty;
    return { frame: frame._id, quantity: qty, price: frame.price };
  });

  return { items, totalAmount };
}

// ─── Graduate-scoped queries ──────────────────────────────────────────────────

export async function getMyFrameOrders(userId, { status } = {}) {
  const query = { graduate: userId };
  if (status) query.status = status;

  return FrameOrder.find(query)
    .populate("items.frame", "name price")
    .populate("shipment", "status latest_tracking_status")
    .select("orderNumber status paymentStatus totalPrice createdAt items shipment")
    .sort({ createdAt: -1 })
    .lean();
}

export async function getMyFrameOrderById(userId, orderId) {
  const order = await FrameOrder.findOne({ _id: orderId, graduate: userId })
    .populate("items.frame", "name price")
    .populate("shipment", "latest_shipment_status_code latest_tracking_status status_log status")
    .select("orderNumber status paymentStatus totalPrice createdAt items shipment notes")
    .lean();

  if (!order) throw notFound("Frame order not found or you don't have access to this order");
  return order;
}

// ─── Admin queries ────────────────────────────────────────────────────────────

export async function getAllFrameOrders({ status, graduate, search, page = 1, limit = 20 } = {}) {
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
      { orderNumber: { $regex: escaped, $options: "i" } },
      { graduate: { $in: matchingGraduates.map((g) => g._id) } },
    ];
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const [total, orders] = await Promise.all([
    FrameOrder.countDocuments(filter),
    FrameOrder.find(filter)
      .populate("graduate", "fullName email phone")
      .populate("items.frame", "name price")
      .populate("shipment", "status receiver")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  return {
    data: orders,
    count: orders.length,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
}

export async function getFrameOrderById(id) {
  const order = await FrameOrder.findById(id)
    .populate("graduate", "fullName email phone")
    .populate("items.frame", "name price")
    .populate("shipment", "status receiver awb_number awb_url tracking_url courierName")
    .lean();

  if (!order) throw notFound();
  return order;
}

// ─── Write operations ─────────────────────────────────────────────────────────

export async function createFrameOrder({ graduate: graduateId, items: rawItems, shipment: shipmentData }, user) {
  const { items, totalAmount } = await resolveItems(rawItems);

  const order = await FrameOrder.create({ graduate: graduateId, items, totalPrice: totalAmount });

  const payment = await Payment.create({
    frameOrder: order._id,
    amount: totalAmount,
    gateway: "billplz",
    paymentStatus: "pending",
  });

  if (shipmentData) {
    const shipment = await Shipment.create({
      frameOrder: order._id,
      receiver: normalizeReceiver(shipmentData.receiver),
    });
    order.shipment = shipment._id;
    await order.save();
  }

  const billplzResponse = await axios.post(
    `${BILLPLZ_API_URL}/bills`,
    {
      collection_id: process.env.BILLPLZ_COLLECTION_ID,
      email: user.email,
      mobile: user.phone,
      name: user.fullName,
      amount: totalAmount * 100,
      description: `Frame Order #${order.orderNumber}`,
      callback_url: process.env.BILLPLZ_CALLBACK_URL,
      redirect_url: process.env.BILLPLZ_REDIRECT_URL,
      reference_1_label: "Order ID",
      reference_1: order.orderNumber,
    },
    { auth: { username: process.env.BILLPLZ_API_KEY, password: "" } }
  );

  payment.paymentUrl = billplzResponse.data.url;
  payment.gatewayTransactionId = billplzResponse.data.id;
  await payment.save();

  return { paymentUrl: billplzResponse.data.url, frameOrderId: order._id };
}

export async function adminCreateFrameOrder({ graduate: graduateId, items: rawItems, shipment: shipmentData, paymentMethod }) {
  if (!["cash", "qr"].includes(paymentMethod)) {
    throw badRequest("paymentMethod must be 'cash' or 'qr'");
  }

  const { items, totalAmount } = await resolveItems(rawItems);

  const order = await FrameOrder.create({
    graduate: graduateId,
    items,
    status: "delivered",
    paymentStatus: "paid",
    totalPrice: totalAmount,
  });

  await Payment.create({
    frameOrder: order._id,
    amount: totalAmount,
    paidAmount: totalAmount,
    gateway: paymentMethod,
    paymentStatus: "paid",
  });

  if (shipmentData) {
    const shipment = await Shipment.create({
      frameOrder: order._id,
      receiver: normalizeReceiver(shipmentData.receiver),
    });
    order.shipment = shipment._id;
    await order.save();
  }

  await order.populate([
    { path: "graduate", select: "fullName email phone" },
    { path: "items.frame", select: "name price" },
  ]);

  sendFrameOrderConfirmation(order).catch((err) =>
    console.error("sendFrameOrderConfirmation failed:", err)
  );

  return order;
}

export async function updateFrameOrder(id, body) {
  const allowed = {};
  for (const key of FRAME_ORDER_UPDATE_FIELDS) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const order = await FrameOrder.findByIdAndUpdate(id, allowed, { new: true, runValidators: true })
    .populate("graduate", "fullName email phone")
    .populate("items.frame", "name price")
    .lean();

  if (!order) throw notFound();
  return order;
}

export async function cancelFrameOrder(id) {
  const order = await FrameOrder.findById(id);
  if (!order) throw notFound();
  if (order.status === "cancelled") throw badRequest("Order is already cancelled");

  const nonCancellable = ["preparing", "delivery", "delivered"];
  if (nonCancellable.includes(order.status)) {
    throw badRequest(`Cannot cancel an order with status "${order.status}"`);
  }

  order.status = "cancelled";
  await order.save();
}

// ─── Payment result (called by bookingService webhook handler) ────────────────

export async function applyFrameOrderPaymentResult(payment, order, isPaid, paidAmountCents) {
  const wasAlreadyPaid = payment.paymentStatus === "paid" || order.paymentStatus === "paid";

  payment.paidAmount = paidAmountCents ? paidAmountCents / 100 : 0;
  payment.paymentStatus = isPaid ? "paid" : "failed";
  if (isPaid) payment.paidAt = new Date();
  await payment.save();

  if (isPaid) {
    order.status = "paid";
    order.paymentStatus = "paid";
    order.totalPrice = payment.paidAmount;

    if (!wasAlreadyPaid) {
      await order.populate([
        { path: "graduate", select: "fullName email phone" },
        { path: "items.frame", select: "name price" },
      ]);
      sendFrameOrderConfirmation(order).catch((err) =>
        console.error("sendFrameOrderConfirmation failed:", err)
      );
    }
  } else {
    order.status = "cancelled";
    order.paymentStatus = "failed";
  }

  await order.save();
  console.log(`[payment] Frame order ${order.orderNumber} → ${payment.paymentStatus}`);
}
