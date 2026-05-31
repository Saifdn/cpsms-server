import mongoose from "mongoose";
import { format } from "date-fns";

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
    },

    graduate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "graduate",
      required: true,
    },

    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },

    addons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Addon",
      },
    ],

    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    // to be remove !!!
    queue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
      default: null,
    },

    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "refunded"
      ],
      default: "pending"
    },

    totalPrice: {
      type: Number,
    },

    status: {
      type: String,
      enum: ["pending", "booked", "checked-in", "in-progress", "completed", "preparing", "delivery", "cancelled"],
      default: "pending",
    },

    bookedAt: {
      type: Date,
      default: Date.now,
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

bookingSchema.index({ status: 1 });
bookingSchema.index({ session: 1 });
bookingSchema.index({ paymentStatus: 1 });

bookingSchema.pre("save", async function () {
  if (!this.bookingNumber) {
    const dateStr = format(new Date(), "yyyyMMdd");
    const count = await this.constructor.countDocuments({
      bookingNumber: new RegExp(`^K70-${dateStr}`),
    });
    this.bookingNumber = `K70-${dateStr}-${String(count + 1).padStart(3, "0")}`;
  }
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;