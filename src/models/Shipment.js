import { transpose } from "date-fns";
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
    shipment_number: String,
    awb_number: String,
    awb_url: String,
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

    // Tracking Information
    latest_shipment_status_code: Number,
    latest_tracking_status: String,
    status_log: [
      {
        timestamp: Date,
        shipment_status_code: Number,
        tracking_status: String,
      }
    ],

    // Internal status
    status: {
      type: String,
      enum: [
        "draft",
        "confirmed",
        "ready",
        "in-transit",
        "out_for_delivery",
        "delivered",
        "failed",
        "returned",
      ],
      default: "draft",
    },
  },
  { timestamps: true },
);

const Shipment = mongoose.model("Shipment", shipmentSchema);
export default Shipment;
