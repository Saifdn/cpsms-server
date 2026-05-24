import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    services: {
      type: [String],
      required: true,
      default: [],
    },
    isPopular: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

// Indexes
packageSchema.index({ isActive: 1, price: 1 });
packageSchema.index({ name: "text", description: "text" });

const Package = mongoose.model("Package", packageSchema);

export default Package;