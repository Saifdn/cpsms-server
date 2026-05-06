import mongoose from "mongoose";

const shipmentSchema = new mongoose.Schema(
  {
    // service_id: {
    //   type: String,
    //   trim: true,
    // },
    // collection_date: {
    //     type: Date,
    // },
    // weight: {
    //     type: Number,
    // },
    // height: {
    //     type: Number,
    // },
    // width: {
    //     type: Number,
    // },
    // length: {
    //     type: Number,
    // },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    receiver: {
      name: String,
      phoneCode: String,
      phoneNumber: String,
      email: String,
      address: {
        line1: String,
        line2: String,
        postcode: String,
        city: String,
        subdivisionCode: String,
        countryCode: String,
      },
    }
  },
  {
    timestamps: true,
  }
);

const Shipment = mongoose.model("Shipment", shipmentSchema);

export default Shipment;