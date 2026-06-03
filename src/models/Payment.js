import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    frameOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FrameOrder",
      default: null,
    },
    gateway: {
      type: String,
    },
    gatewayTransactionId: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
      ],
      default: "pending",
    },
    amount: {
      type: Number,
    },
    paidAmount: {
      type: Number,
    },
    paymentUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;