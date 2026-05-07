import Payment from "../models/Payment.js";

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
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.json({ success: true, data: payment.paymentStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};