import mongoose from "mongoose";
import { format } from "date-fns";

const frameOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },

    graduate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "graduate",
      required: true,
    },

    items: [
      {
        frame: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Frame",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    status: {
      type: String,
      enum: ["pending", "paid", "preparing", "delivery", "delivered", "cancelled"],
      default: "pending",
    },

    totalPrice: {
      type: Number,
    },

    notes: {
      type: String,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  }
);

frameOrderSchema.index({ status: 1 });
frameOrderSchema.index({ paymentStatus: 1 });
frameOrderSchema.index({ graduate: 1 });

frameOrderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    const dateStr = format(new Date(), "yyyyMMdd");
    const count = await this.constructor.countDocuments({
      orderNumber: new RegExp(`^FR-${dateStr}`),
    });
    this.orderNumber = `FR-${dateStr}-${String(count + 1).padStart(3, "0")}`;
  }
});

const FrameOrder = mongoose.model("FrameOrder", frameOrderSchema);

export default FrameOrder;
