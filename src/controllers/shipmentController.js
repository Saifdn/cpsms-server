import axios from "axios";
import "dotenv/config";

import Booking from "../models/Booking.js";

const EP_API = process.env.EP_API_URL || "https://api.easyparcel.com/open_api/2026-03";

const handleError = (res, err, message) => {
  return res.status(err.response?.status || 500).json({
    success: false,
    message,
    error: err.response?.data || err.message,
  });
};

export const getPendingShipments = async (req, res) => {
  try {
    const pendingBookings = await Booking.find({
      // Bookings that are paid/confirmed but shipment not yet created
      status: { $in: ["completed"] },
    })
    .populate("graduate", "fullName email phone")
    .populate("package", "name price")
    // .populate("session", "date startTime endTime")
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pendingBookings,
      count: pendingBookings.length,
    });
  } catch (error) {
    console.error("Get Pending Shipments Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending shipments from database"
    });
  }
};

export const getQuotation = async (req, res) => {
  try {
    const { bookingIds } = req.body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "bookingIds array is required",
      });
    }

    // Fetch bookings with necessary data
    const bookings = await Booking.find({ _id: { $in: bookingIds } })
      .populate("shipment");

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bookings found",
      });
    }

    // Build payload for EasyParcel
    const shipmentArray = bookings.map((booking) => {
      const receiver = booking.shipment?.receiver || {};

      return {
        sender: {
          postcode: "81310", 
          subdivision_code: "MY-01",
          country: "MY",
        },
        receiver: {
          postcode: receiver.postcode,
          subdivision_code: receiver.subdivision_code,
          country: receiver.country_code,
        },
        weight: 0.5,
        width: 15,
        length: 40,
        height: 4,
        parcel_value: booking.totalPrice,
      };
    });

    const payload = { shipment: shipmentArray };

    // Call EasyParcel Quotation API
    const response = await axios.post(
      `${EP_API}/shipment/quotations`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${req.epToken}`,
        },
      }
    );

    // === Process Response for Global Selection ===
    const allQuotations = response.data?.data || [];

    // Group quotations by service_id
    const groupedByService = {};

    allQuotations.forEach((item, index) => {
      if (item.status !== "success" || !item.quotations) return;

      item.quotations.forEach((quote) => {
        const serviceId = quote.courier?.service_id;
        if (!serviceId) return;

        if (!groupedByService[serviceId]) {
          groupedByService[serviceId] = {
            serviceId,
            serviceName: quote.courier?.service_name,
            courierName: quote.courier?.courier_name,
            courierLogo: quote.courier?.courier_logo,
            deliveryDuration: quote.courier?.delivery_duration,
            isPickup: quote.courier?.is_pickup,
            totalAmount: 0,
            count: 0,
            minPrice: Infinity,
            maxPrice: 0,
          };
        }

        const price = parseFloat(quote.pricing?.total_amount || 0);
        groupedByService[serviceId].totalAmount += price;
        groupedByService[serviceId].count += 1;
        groupedByService[serviceId].minPrice = Math.min(groupedByService[serviceId].minPrice, price);
        groupedByService[serviceId].maxPrice = Math.max(groupedByService[serviceId].maxPrice, price);
      });
    });

    // Convert to array and sort by total cost
    const summarizedOptions = Object.values(groupedByService)
      .map(option => ({
        ...option,
        averagePrice: (option.totalAmount / option.count).toFixed(2),
      }))
      .sort((a, b) => a.totalAmount - b.totalAmount); // Cheapest first

    res.json({
      success: true,
      totalBookings: bookings.length,
      totalQuotationsFound: summarizedOptions.length,
      options: summarizedOptions,
      rawData: response.data,           // for debugging
    });

  } catch (err) {
    return handleError(res, err, "Failed to get quotation");
  }
};

// controllers/shipmentController.js

export const submitOrder = async (req, res) => {
  try {
    const { bookingIds, serviceId, serviceName, courierName } = req.body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ success: false, message: "bookingIds array is required" });
    }

    if (!serviceId) {
      return res.status(400).json({ success: false, message: "serviceId is required" });
    }

    const results = [];
    let successCount = 0;

    // Fetch bookings with all necessary data
    const bookings = await Booking.find({ _id: { $in: bookingIds } })
      .populate("shipment")
      .populate("package", "name");

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: "No bookings found" });
    }

    const shipmentPayload = [];

    for (const booking of bookings) {
      try {
        if (!booking.shipment) {
          results.push({ bookingId: booking._id, status: "failed", reason: "Shipment record not found" });
          continue;
        }

        const receiver = booking.shipment.receiver || {};
        const graduate = booking.graduate || {};

        // Build one shipment object per booking
        shipmentPayload.push({
          reference: booking.bookingNumber,
          service_id: serviceId,
          collection_date: "2025-12-31", // You can make this dynamic if needed
          // Dimensions (you can make these dynamic later)
          weight: 0.5,
          height: 5,
          length: 5,
          width: 5,

          // Items (you can expand this if you have multiple items per booking)
          item: [
            {
              content: booking.package?.name || "Studio Session Package",
              weight: 0.5,
              height: 5,
              length: 5,
              width: 5,
              currency_code: "MYR",
              value: booking.totalPrice,
              quantity: 1,
            }
          ],

          sender: {
            name: "KFK Studio",
            company: "Kelab Fotokreaetif",
            phone_number_country_code: "MY",
            phone_number: "1126760658",
            email: "admin@kfk.com",
            address_1: "123 Main St",
            address_2: "",
            postcode: "10150",
            city: "Lunas",
            subdivision_code: "MY-01",
            country_code: "MY",
          },

          receiver: {
            name: receiver.name,
            phone_number_country_code: receiver.phone_number_country_code,
            phone_number: receiver.phone_number,
            email: receiver.email,
            address_1: receiver.address_1,
            address_2: receiver.address_2 || "",
            postcode: receiver.postcode,
            city: receiver.city,
            subdivision_code: receiver.subdivision_code,
            country_code: receiver.country_code,
          },

          feature: {
            sms_tracking: false,
            email_tracking: true,
            whatsapp_tracking: true,
          }
        });

        // Update shipment record
        await Shipment.findByIdAndUpdate(booking.shipment, {
            serviceId,
            serviceName: serviceName || "",
            courierName: courierName || "",
          status: "submitted"
        });

        results.push({ bookingId: booking._id, status: "success" });
        successCount++;

      } catch (err) {
        results.push({ bookingId: booking._id, status: "failed", reason: err.message });
      }
    }

    // Call EasyParcel Submit Order API
    let easyParcelResponse = null;

    if (shipmentPayload.length > 0) {
      easyParcelResponse = await axios.post(
        `${EP_API}/shipment/submit_orders`,
        { shipment: shipmentPayload },
        {
          headers: {
            Authorization: `Bearer ${req.epToken}`,
          },
        }
      );
    }

    res.json({
      success: true,
      message: `Successfully submitted ${successCount} orders to EasyParcel`,
      processed: bookingIds.length,
      successCount,
      easyParcelResponse: easyParcelResponse?.data,
      results
    });

  } catch (error) {
    console.error("Submit Order Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to submit orders to EasyParcel",
      error: error.message
    });
  }
};

export const getWalletBalance = async (req, res) => {
  try {
    const response = await axios.get(
      `${EP_API}/account/wallet_balance`,
      {
        headers: {
          Authorization: `Bearer ${req.epToken}`,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    return handleError(res, err, "Failed to fetch wallet");
  }
};