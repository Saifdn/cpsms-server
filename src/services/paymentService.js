import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound(message = "Payment not found") {
  const err = new Error(message);
  err.statusCode = 404;
  err.isOperational = true;
  return err;
}

// ─── Payment Service ──────────────────────────────────────────────────────────

export async function getPaymentById(id) {
  const payment = await Payment.findById(id).lean();
  if (!payment) throw notFound();
  return payment;
}

export async function getPaymentStatus(gatewayTransactionId) {
  const payment = await Payment.findOne({ gatewayTransactionId })
    .select("paymentStatus booking")
    .lean();
  if (!payment) throw notFound();

  const booking = await Booking.findById(payment.booking).select("bookingNumber").lean();
  if (!booking) throw notFound("Booking associated with this payment not found");

  return { paymentStatus: payment.paymentStatus, bookingNumber: booking.bookingNumber };
}
