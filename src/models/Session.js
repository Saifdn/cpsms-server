import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["available", "full"],
      default: "available",
    },
    // Reference to the generation batch (useful for management)
    batchId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
sessionSchema.index({ date: 1, startTime: 1 });
sessionSchema.index({ batchId: 1 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;