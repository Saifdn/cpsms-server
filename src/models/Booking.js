import mongoose from "mongoose";
import { format } from "date-fns";

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
    //   required: true,
      unique: true,
    },

    // Who booked
    graduate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "graduate",
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

    // Where (filled after check-in)
    studio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Studio",
      default: null,
    },

    // Booking Details
    status: {
      type: String,
      enum: ["booked", "confirmed", "checked-in", "completed", "cancelled"],
      default: "booked",
    },

    bookedAt: {
      type: Date,
      default: Date.now,
    },

    checkInTime: {
      type: Date,
      default: null,
    },

    checkOutTime: {
      type: Date,
      default: null,
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

// Auto-generate booking number before saving
bookingSchema.pre("save", async function () {
  if (!this.bookingNumber) {
    const dateStr = format(new Date(), "yyyyMMdd");

    const count = await mongoose.model("Booking").countDocuments({
      bookingNumber: new RegExp(`^K70-${dateStr}`),
    });

    this.bookingNumber = `K70-${dateStr}-${String(count + 1).padStart(3, "0")}`;
  }
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;