import axios from "axios";
import "dotenv/config";

import Booking from "../models/Booking.js";
import Shipment from "../models/Shipment.js";
import Session from "../models/Session.js";

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

    const { date, page = 1, limit = 20 } = req.query;

    const filter = { status: { $in: ["completed"] } };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const sessions = await Session.find({
        date: {
          $gte: start,
          $lte: end,
        },
      }).select("_id");

      filter.session = {
        $in: sessions.map((s) => s._id),
      };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Booking.countDocuments(filter);

    const pendingBookings = await Booking.find(filter)
      .populate("graduate", "fullName email phone")
      .populate("package", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      data: pendingBookings,
      count: pendingBookings.length,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get Pending Shipments Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending shipments from database"
    });
  }
};

export const getSubmittedShipments = async (req, res) => {
  try {

    const { date, page = 1, limit = 20 } = req.query;

    const filter = { status: { $in: ["preparing", "delivery"] } };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const sessions = await Session.find({
        date: {
          $gte: start,
          $lte: end,
        },
      }).select("_id");

      filter.session = {
        $in: sessions.map((s) => s._id),
      };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Booking.countDocuments(filter);

    const pendingBookings = await Booking.find(filter)
      .populate("graduate", "fullName email phone")
      .populate("package", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      data: pendingBookings,
      count: pendingBookings.length,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get Submitted Shipments Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch submitted shipments from database"
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

export const submitOrder = async (req, res) => {
  try {
    const { bookingIds, serviceId, serviceName, courierName, sender, packageDetails, features, collectionDate } = req.body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "bookingIds array is required",
      });
    }

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: "serviceId is required",
      });
    }

    const results = [];

    // Fetch bookings
    const bookings = await Booking.find({
      _id: { $in: bookingIds },
    })
      .populate("shipment")
      .populate("package", "name");

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bookings found",
      });
    }

    const shipmentPayload = [];

    // Build payload only
    for (const booking of bookings) {
      try {
        if (!booking.shipment) {
          results.push({
            bookingId: booking._id,
            status: "failed",
            reason: "Shipment record not found",
          });
          continue;
        }

        const receiver = booking.shipment.receiver || {};

        shipmentPayload.push({
          reference: booking.bookingNumber,
          service_id: serviceId,
          collection_date: collectionDate,

          weight: packageDetails.weight || 0.5,
          height: packageDetails.height || 5,
          length: packageDetails.length || 5,
          width: packageDetails.width || 5,

          item: [
            {
              content: booking.package?.name || "Studio Session Package",
              weight: packageDetails.weight || 0.5,
              height: packageDetails.height || 5,
              length: packageDetails.length || 5,
              width: packageDetails.width || 5,
              currency_code: "MYR",
              value: booking.totalPrice,
              quantity: 1,
            },
          ],

          sender: {
            name: sender.name,
            company: sender.company,
            phone_number_country_code: sender.phone_number_country_code,
            phone_number: sender.phone_number,
            email: sender.email,
            address_1: sender.address_1,
            address_2: sender.address_2 || "",
            postcode: sender.postcode,
            city: sender.city,
            subdivision_code: sender.subdivision_code,
            country_code: sender.country_code,
          },

          receiver: {
            name: receiver.name,
            phone_number_country_code:
              receiver.phone_number_country_code,
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
            sms_tracking: features?.sms_tracking || false,
            email_tracking: features?.email_tracking || true,
            whatsapp_tracking: features?.whatsapp_tracking || true,
          },
        });
      } catch (err) {
        results.push({
          bookingId: booking._id,
          status: "failed",
          reason: err.message,
        });
      }
    }

    // Submit to EasyParcel
    let easyParcelResponse = null;

    if (shipmentPayload.length > 0) {
      easyParcelResponse = await axios.post(
        `${EP_API}/shipment/submit_orders`,
        {
          shipment: shipmentPayload,
        },
        {
          headers: {
            Authorization: `Bearer ${req.epToken}`,
          },
        }
      );
    }

    // Process EasyParcel response
    const responseData = easyParcelResponse?.data?.data || [];

    for (const order of responseData) {
      const shipments = order.shipments || [];

      for (const shipment of shipments) {
        try {
          // Skip failed shipment
          if (shipment.status !== "success") {
            results.push({
              reference: shipment.reference,
              status: "failed",
              reason: "EasyParcel shipment failed",
            });

            continue;
          }

          // Find booking using reference
          const booking = bookings.find(
            (b) => b.bookingNumber === shipment.reference
          );

          if (!booking || !booking.shipment) {
            results.push({
              reference: shipment.reference,
              status: "failed",
              reason: "Booking not found from reference",
            });

            continue;
          }

          // Update shipment
          await Shipment.findByIdAndUpdate(booking.shipment._id, {

            // order_number: shipment.order_details.order_number,

            serviceId: serviceId,
            serviceName: serviceName || "",
            courierName: courierName || "",

            shipment_number: shipment.shipment_number,
            awb_number: shipment.awb_number,
            awb_url: shipment.awb_url,
            tracking_url: shipment.tracking_url,

            status: "confirmed",
          });

          await Booking.findByIdAndUpdate(booking._id, {
            status: "preparing",
          });

          results.push({
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
            status: "success",
            shipment_number: shipment.shipment_number,
          });
        } catch (err) {
          results.push({
            reference: shipment.reference,
            status: "failed",
            reason: err.message,
          });
        }
      }
    }

    const successCount = results.filter(
      (r) => r.status === "success"
    ).length;

    res.json({
      success: true,
      message: `Successfully submitted ${successCount} orders to EasyParcel`,
      processed: bookingIds.length,
      successCount,
      easyParcelResponse: easyParcelResponse?.data,
      results,
    });
  } catch (error) {
    console.error(
      "Submit Order Error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to submit orders to EasyParcel",
      error: error.message,
    });
  }
};

export const getWalletBalance = async (req, res) => {
  try {
    const response = await axios.get(
      `${EP_API}/wallet`,
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