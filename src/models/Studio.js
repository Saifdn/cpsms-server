import mongoose from "mongoose";

const studioSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isOccupied: {
      type: Boolean,
      default: false,
    },
    currentBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
  },
  {
    timestamps: true,        // Adds createdAt & updatedAt
  }
);

// Index for faster queries
studioSchema.index({ isAvailable: 1, isOccupied: 1 });
studioSchema.index({ name: 1 });

const Studio = mongoose.model("Studio", studioSchema);

export default Studio;