import mongoose from "mongoose";
import { format } from "date-fns";

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
    },

    // Who booked
    graduate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "graduate", // discriminator
      required: true,
    },

    // What was booked
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },

    // When
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    // 🔥 Link to queue (NEW)
    queue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
      default: null,
    },

    // User-facing status
    status: {
      type: String,
      enum: ["booked", "checked-in", "in-progress", "completed", "cancelled"],
      default: "booked",
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

// 🔥 Index for performance
bookingSchema.index({ status: 1 });
bookingSchema.index({ session: 1 });

// 🔥 Auto-generate booking number
// Auto-generate booking number
// 🔥 Auto-generate booking number
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