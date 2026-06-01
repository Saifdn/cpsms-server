import mongoose from "mongoose";

const dailyCounterSchema = new mongoose.Schema({
  _id: String, // date string "YYYY-MM-DD"
  seq: { type: Number, default: 0 },
});

const DailyCounter = mongoose.models.DailyCounter || mongoose.model("DailyCounter", dailyCounterSchema);

async function nextQueueNumber() {
  const today = new Date().toISOString().slice(0, 10);
  const doc = await DailyCounter.collection.findOneAndUpdate(
    { _id: today },
    [{ $set: { seq: { $add: [{ $ifNull: ["$seq", 1000] }, 1] } } }],
    { upsert: true, returnDocument: "after" }
  );
  return doc.seq;
}

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

    position: Number,

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

    skippedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
queueSchema.index({ checkInTime: 1 });

// Auto-assign queue number atomically using a daily counter document
queueSchema.pre("validate", async function () {
  if (!this.queueNumber) {
    this.queueNumber = await nextQueueNumber();
  }
});

queueSchema.statics.getActiveQueue = async function () {
  return this.find({
    status: { $in: ["waiting", "called", "in-progress"] },
  })
    .sort({ queueNumber: 1 })
    .populate("studio", "name location")
    .populate({
      path: "booking",
      populate: [
        { path: "graduate", select: "fullName email phone" },
        { path: "package", select: "name description services" },
      ],
    });
};

queueSchema.statics.getNextWaiting = function () {
  return this.findOne({ status: "waiting" }).sort({ skippedCount: 1, queueNumber: 1 });
};

const Queue = mongoose.model("Queue", queueSchema);

export default Queue;