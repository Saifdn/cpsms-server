import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";

export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getPaymentStatusById = async (req, res) => {
  try {

    const { id } = req.params;

    const payment = await Payment.findOne({gatewayTransactionId: id})
      .select("paymentStatus booking");

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    const booking = await Booking.findById(payment.booking)
      .select("bookingNumber");

    res.status(200).json({ success: true, data: { paymentStatus: payment.paymentStatus, bookingNumber: booking.bookingNumber } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};