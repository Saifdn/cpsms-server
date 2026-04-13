import mongoose from "mongoose";

const promoAdSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 200,
    },
    imageBase64: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const PromoAd = mongoose.model("PromoAd", promoAdSchema);

export default PromoAd;