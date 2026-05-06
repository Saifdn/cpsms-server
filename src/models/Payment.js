import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
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
        "expired",
        "refunded"
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