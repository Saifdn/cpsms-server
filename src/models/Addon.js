import mongoose from "mongoose";

const addonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      maxlength: 300,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    normalPrice: {
      type: Number,
      min: 0,
    }
  },
  {
    timestamps: true,
  }
);

addonSchema.index({ isActive: 1, price: 1 });

const Addon = mongoose.model("Addon", addonSchema);

export default Addon;