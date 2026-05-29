import axios from "axios";
import { PDFDocument } from "pdf-lib";
import Booking from "../models/Booking.js";
import Shipment from "../models/Shipment.js";
import Session from "../models/Session.js";

const EP_API = process.env.EP_API_URL || "https://api.easyparcel.com/open_api/2026-03";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound(message = "Not found") {
  const err = new Error(message);
  err.statusCode = 404;
  err.isOperational = true;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.isOperational = true;
  return err;
}

// Wraps EasyParcel axios errors into operational errors so the global
// errorHandler returns a clean JSON response without leaking EP internals.
function epError(err, fallback) {
  const message = err.response?.data?.message || fallback;
  const status = err.response?.status || 500;
  const error = new Error(message);
  error.statusCode = status;
  error.isOperational = true;
  return error;
}

// Shared date → session IDs filter used by both list endpoints
async function sessionIdsForDate(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return Session.find({ date: { $gte: start, $lte: end } }).select("_id").lean();
}

async function paginateBookings(filter, { page = 1, limit = 20 }, populateChain) {
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const [total, docs] = await Promise.all([
    Booking.countDocuments(filter),
    populateChain(Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum)),
  ]);

  return {
    data: docs,
    count: docs.length,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
}

// ─── Shipment Service ─────────────────────────────────────────────────────────

export async function getPendingShipments({ date, page, limit }) {
  const filter = { status: { $in: ["completed"] } };

  if (date) {
    const sessions = await sessionIdsForDate(date);
    filter.session = { $in: sessions.map((s) => s._id) };
  }

  return paginateBookings(filter, { page, limit }, (q) =>
    q
      .populate("graduate", "fullName email phone")
      .populate("package", "name")
      .populate("addons", "name")
      .populate("shipment", "receiver status")
      .select("addons status bookingNumber")
      .lean()
  );
}

export async function getSubmittedShipments({ date, page, limit }) {
  const filter = { status: { $in: ["preparing", "delivery"] } };

  if (date) {
    const sessions = await sessionIdsForDate(date);
    filter.session = { $in: sessions.map((s) => s._id) };
  }

  return paginateBookings(filter, { page, limit }, (q) =>
    q
      .populate("graduate", "fullName email phone")
      .populate("package", "name")
      .populate("addons", "name")
      .populate("shipment", "receiver status awb_number awb_url courierName tracking_url")
      .select("addons status bookingNumber")
      .lean()
  );
}

export async function getQuotation(bookingIds, epToken) {
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw badRequest("bookingIds array is required");
  }

  const bookings = await Booking.find({ _id: { $in: bookingIds } }).populate("shipment").lean();
  if (bookings.length === 0) throw notFound("No bookings found");

  const shipmentArray = bookings.map((booking) => {
    const receiver = booking.shipment?.receiver || {};
    return {
      sender: { postcode: "81310", subdivision_code: "MY-01", country: "MY" },
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

  let response;
  try {
    response = await axios.post(
      `${EP_API}/shipment/quotations`,
      { shipment: shipmentArray },
      { headers: { Authorization: `Bearer ${epToken}` } }
    );
  } catch (err) {
    throw epError(err, "Failed to get quotation from EasyParcel");
  }

  const allQuotations = response.data?.data || [];
  const groupedByService = {};

  allQuotations.forEach((item) => {
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

  const options = Object.values(groupedByService)
    .map((o) => ({ ...o, averagePrice: (o.totalAmount / o.count).toFixed(2) }))
    .sort((a, b) => a.totalAmount - b.totalAmount);

  return { totalBookings: bookings.length, totalQuotationsFound: options.length, options };
}

export async function submitOrder(
  { bookingIds, serviceId, serviceName, courierName, sender, packageDetails, features, collectionDate },
  epToken
) {
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw badRequest("bookingIds array is required");
  }
  if (!serviceId) throw badRequest("serviceId is required");

  const bookings = await Booking.find({ _id: { $in: bookingIds } })
    .populate("shipment")
    .populate("package", "name");

  if (bookings.length === 0) throw notFound("No bookings found");

  const results = [];
  const shipmentPayload = [];

  for (const booking of bookings) {
    if (!booking.shipment) {
      results.push({ bookingId: booking._id, status: "failed", reason: "Shipment record not found" });
      continue;
    }

    const receiver = booking.shipment.receiver || {};
    shipmentPayload.push({
      reference: booking.bookingNumber,
      service_id: serviceId,
      collection_date: collectionDate,
      weight: packageDetails?.weight || 1,
      height: packageDetails?.height || 5,
      length: packageDetails?.length || 5,
      width: packageDetails?.width || 5,
      item: [
        {
          content: booking.package?.name || "Studio Session Package",
          weight: packageDetails?.weight || 1,
          height: packageDetails?.height || 5,
          length: packageDetails?.length || 5,
          width: packageDetails?.width || 5,
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
        sms_tracking: features?.sms_tracking ?? false,
        email_tracking: features?.email_tracking ?? true,
        whatsapp_tracking: features?.whatsapp_tracking ?? true,
      },
    });
  }

  let epResponse = null;
  if (shipmentPayload.length > 0) {
    try {
      epResponse = await axios.post(
        `${EP_API}/shipment/submit_orders`,
        { shipment: shipmentPayload },
        { headers: { Authorization: `Bearer ${epToken}` } }
      );
    } catch (err) {
      throw epError(err, "Failed to submit orders to EasyParcel");
    }
  }

  const responseData = epResponse?.data?.data || [];

  for (const order of responseData) {
    for (const shipment of order.shipments || []) {
      if (shipment.status !== "success") {
        results.push({ reference: shipment.reference, status: "failed", reason: "EasyParcel shipment failed" });
        continue;
      }

      const booking = bookings.find((b) => b.bookingNumber === shipment.reference);
      if (!booking?.shipment) {
        results.push({ reference: shipment.reference, status: "failed", reason: "Booking not found from reference" });
        continue;
      }

      await Shipment.findByIdAndUpdate(booking.shipment._id, {
        serviceId,
        serviceName: serviceName || "",
        courierName: courierName || "",
        shipment_number: shipment.shipment_number,
        awb_number: shipment.awb_number,
        awb_url: shipment.awb_url,
        tracking_url: shipment.tracking_url,
        status: "confirmed",
      });

      await Booking.findByIdAndUpdate(booking._id, { status: "preparing" });

      results.push({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        status: "success",
        shipment_number: shipment.shipment_number,
      });
    }
  }

  const successCount = results.filter((r) => r.status === "success").length;
  return { processed: bookingIds.length, successCount, results };
}

export async function mergeAwbPdfs(bookingIds) {
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    throw badRequest("shipmentIds must be a non-empty array");
  }

  const shipments = await Shipment.find({
    booking: { $in: bookingIds },
    awb_url: { $nin: [null, ""] },
  })
    .select("awb_url awb_number")
    .lean();

  if (shipments.length === 0) throw notFound("No AWB labels found for the given shipments");

  const merged = await PDFDocument.create();

  await Promise.all(
    shipments.map(async (s) => {
      let bytes;
      try {
        const resp = await axios.get(s.awb_url, { responseType: "arraybuffer" });
        bytes = resp.data;
      } catch {
        return; // skip if URL is unreachable
      }
      const src = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    })
  );

  return merged.save();
}

export async function getWalletBalance(epToken) {
  try {
    const response = await axios.get(`${EP_API}/wallet`, {
      headers: { Authorization: `Bearer ${epToken}` },
    });
    return response.data;
  } catch (err) {
    throw epError(err, "Failed to fetch wallet balance");
  }
}
