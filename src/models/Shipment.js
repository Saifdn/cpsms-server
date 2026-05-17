import mongoose from "mongoose";

const shipmentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    // EasyParcel Response Fields
    order_number: String,
    awb_number: String,
    label_url: String,
    tracking_url: String,

    serviceId: String,
    serviceName: String,
    courierName: String,

    // EasyParcel Receiver Object - Match API exactly
    receiver: {
      name: { type: String, required: true },
      company: { type: String },
      phone_number_country_code: { type: String, default: "MY" },
      phone_number: { type: String, required: true },
      email: { type: String },

      address_1: { type: String, required: true },
      address_2: { type: String },
      postcode: { type: String, required: true },
      city: { type: String, required: true },
      subdivision_code: { type: String }, // e.g., "MY-07"
      country_code: { type: String, default: "MY" },
    },

    // Internal status
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "shipped",
        "delivered",
        "failed",
      ],
      default: "draft",
    },
  },
  { timestamps: true },
);

const Shipment = mongoose.model("Shipment", shipmentSchema);
export default Shipment;
