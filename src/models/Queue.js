import mongoose from "mongoose";

const queueSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },

    studio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Studio",
      default: null,
    },

    queueNumber: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["waiting", "called", "in-progress", "completed", "cancelled"],
      default: "waiting",
    },

    checkInTime: {
      type: Date,
      default: Date.now,
    },

    startTime: {
      type: Date,
      default: null,
    },

    endTime: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
queueSchema.index({ status: 1, queueNumber: 1 });
queueSchema.index({ checkInTime: 1 });

// Auto-assign queue number - CLEAN VERSION
queueSchema.pre("validate", async function () {
  try {
    if (!this.queueNumber) {
      const Queue = this.constructor;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const count = await Queue.countDocuments({
        checkInTime: { $gte: startOfDay },
      });
      this.queueNumber = count + 1;
    }
  } catch (err) {
    console.error("Queue number generation error:", err);
    throw err; // re-throw so Mongoose knows something went wrong
  }
});

queueSchema.statics.getActiveQueue = async function () {
  return this.find({
    status: { $in: ["waiting", "called", "in-progress"] },
  })
    .sort({ queueNumber: 1 })
    .populate({
      path: "booking",
      populate: [
        { path: "graduate", select: "fullName email phone" },
        { path: "package", select: "name price" },
      ],
    });
};

queueSchema.statics.getNextWaiting = function () {
  return this.findOne({ status: "waiting" }).sort({ queueNumber: 1 });
};

const Queue = mongoose.model("Queue", queueSchema);

export default Queue;