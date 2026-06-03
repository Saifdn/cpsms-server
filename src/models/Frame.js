import mongoose from "mongoose";

const frameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      maxlength: 300,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

frameSchema.index({ isActive: 1 });
frameSchema.index({ price: 1 });

const Frame = mongoose.model("Frame", frameSchema);

export default Frame;
