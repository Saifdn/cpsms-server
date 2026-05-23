import Booking from "../models/Booking.js";
import Session from "../models/Session.js";
import axios from "axios";
import Payment from "../models/Payment.js";
import Graduate from "../models/Graduate.js";
import Package from "../models/Package.js";
import Addon from "../models/Addon.js";
import Shipment from "../models/Shipment.js";

import { sendBookingConfirmation } from "../utils/sendBookingEmail.js";

import crypto from "crypto";

export const getMyBookings = async (req, res) => {
  try {
    const { status } = req.query;

    const query = { graduate: req.user.userId };

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('package', 'name services price')
      .populate('addons', 'name price')
      .populate('session', 'date startTime endTime')
      .select('package addons session paymentStatus status bookedAt bookingNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error('Get My Bookings Error:', error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching your bookings",
    });
  }
};

export const getMyBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      graduate: req.user.userId
    })
      .populate('package', 'name services price')
      .populate('addons', 'name price')
      .populate('session', 'date startTime endTime')
      .populate('shipment', 'latest_shipment_status_code latest_tracking_status status_log')
      .select('paymentStatus status bookedAt bookingNumber totalPrice')

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or you don't have access to this booking"
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get all bookings (with optional filters)
export const getAllBookings = async (req, res) => {
  try {
    const { status, graduate, date, search, page = 1, limit = 20 } = req.query;

    let filter = {};

    if (status) filter.status = status;
    if (graduate) filter.graduate = graduate;

    if (search) {
      const matchingGraduates = await Graduate.find({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const graduateIds = matchingGraduates.map((g) => g._id);

      filter.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { graduate: { $in: graduateIds } },
      ];
    }

    // Date filter (by session date)
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

      if (sessions.length > 0) {
        filter.session = { $in: sessions.map((s) => s._id) };
      } else {
        // No sessions on this date → return empty result
        return res.json({
          success: true,
          data: [],
          count: 0,
          pagination: {
            total: 0,
            page: Number(page),
            limit: Number(limit),
            totalPages: 0,
          },
        });
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .populate("graduate", "fullName email phone")
      .populate("package", "name price")
      .populate("session", "date startTime endTime")
      // .populate("studio", "name location")
      .sort({ bookedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      data: bookings,
      count: bookings.length,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get All Bookings Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings from database",
    });
  }
};

// Get single booking
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("graduate", "fullName email phone")
      .populate("package", "name price")
      .populate("session", "date startTime endTime")
      .populate("studio", "name location");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Used when scanning QR code (bookingNumber like "K70-20260415-001")
export const getBookingByNumber = async (req, res) => {
  try {
    const { bookingNumber } = req.params;

    const booking = await Booking.findOne({ bookingNumber })
      .populate("graduate", "fullName email phone")
      .populate("package", "name price")
      .populate("addons", "name price")
      .populate("session", "date startTime endTime")
      .select("bookingNumber status totalPrice bookedAt");

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: `Booking with number ${bookingNumber} not found` 
      });
    }

    res.json({ 
      success: true, 
      data: booking 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { graduate: graduateId, package: packageId, session: sessionId, addons = [], shipment: shipmentData } = req.body;
    // const graduateId = req.user.id;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (session.bookedCount >= session.capacity) {
      return res.status(400).json({ success: false, message: "Session is fully booked" });
    }

    // 1. Fetch Package price + Addons prices
    const packageData = await Package.findById(packageId);
    if (!packageData) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    let totalAmount = packageData.price;

    // Add addons price if any
    if (addons && addons.length > 0) {
      const addonData = await Addon.find({ _id: { $in: addons } });
      const addonTotal = addonData.reduce((sum, addon) => sum + addon.price, 0);
      totalAmount += addonTotal;
    }

    // 1. Create Booking (Draft)
    const booking = await Booking.create({
      graduate: graduateId,
      package: packageId,
      session: sessionId,
      addons: addons,
    });

    // 2. Create Payment Record
    const payment = await Payment.create({
      booking: booking._id,
      amount: totalAmount,
      gateway: "billplz",
      paymentStatus: "pending",
    });

    let shipment = null;
    if (shipmentData) {
      shipment = await Shipment.create({
        booking: booking._id,
        receiver: shipmentData.receiver,
      });

      // Link shipment back to booking
      booking.shipment = shipment._id;
      await booking.save();
    }

    // 3. Call Billplz API
    const billplzResponse = await axios.post(
      "https://www.billplz-sandbox.com/api/v3/bills",
      {
        collection_id: process.env.BILLPLZ_COLLECTION_ID,
        email: req.user.email,
        name: req.user.fullName,
        amount: totalAmount * 100,
        description: `Booking #${booking.bookingNumber}`,
        callback_url: process.env.BILLPLZ_CALLBACK_URL,
        redirect_url: process.env.BILLPLZ_REDIRECT_URL,
        reference_1_label: "Booking ID",
        reference_1: booking.bookingNumber,
      },
      {
        auth: {
          username: process.env.BILLPLZ_API_KEY,
          password: "",
        },
      }
    );

    // 4. Save Billplz URL to Payment
    payment.paymentUrl = billplzResponse.data.url;
    payment.gatewayTransactionId = billplzResponse.data.id;
    await payment.save();

    res.status(201).json({
      success: true,
      message: "Booking created. Redirecting to payment...",
      paymentUrl: billplzResponse.data.url,
      bookingId: booking._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  }
};

// Update booking status (e.g., check-in, complete)
export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("graduate package session studio");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({
      success: true,
      message: "Booking updated successfully",
      data: booking,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Cancel booking
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled" },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.paymentStatus === "paid") {
      const session = await Session.findById(booking.session);
      if (session && session.bookedCount > 0) {
        session.bookedCount -= 1;
        session.status = session.bookedCount >= session.capacity ? "full" : "available";
        await session.save();
      }
    }

    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const adminCreateBooking = async (req, res) => {
  try {
    const {
      graduate: graduateId,
      package: packageId,
      session: sessionId,
      addons = [],
      paymentMethod,
      shipment: shipmentData,
    } = req.body;

    if (!["cash", "qr"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "paymentMethod must be 'cash' or 'qr'" });
    }

    const packageData = await Package.findById(packageId);
    if (!packageData) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    let totalAmount = packageData.price;
    if (addons.length > 0) {
      const addonData = await Addon.find({ _id: { $in: addons } });
      totalAmount += addonData.reduce((sum, addon) => sum + addon.price, 0);
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (session.bookedCount >= session.capacity) {
      return res.status(400).json({ success: false, message: "Session is fully booked" });
    }

    const booking = await Booking.create({
      graduate: graduateId,
      package: packageId,
      session: sessionId,
      addons,
      status: "booked",
      paymentStatus: "paid",
      totalPrice: totalAmount,
    });

    await Payment.create({
      booking: booking._id,
      amount: totalAmount,
      paidAmount: totalAmount,
      gateway: paymentMethod,
      paymentStatus: "paid",
    });

    if (shipmentData) {
      const shipment = await Shipment.create({
        booking: booking._id,
        receiver: shipmentData.receiver,
      });
      booking.shipment = shipment._id;
      await booking.save();
    }

    session.bookedCount += 1;
    session.status = session.bookedCount >= session.capacity ? "full" : "available";
    await session.save();

    await booking.populate([
      { path: "graduate", select: "fullName email phone" },
      { path: "package", select: "name price services" },
      { path: "session", select: "date startTime endTime" },
      { path: "addons", select: "name price" },
    ]);

    sendBookingConfirmation(booking).catch((err) => {
      console.error("Email failed but booking already updated:", err);
    });

    res.status(201).json({
      success: true,
      message: "Booking created and payment recorded successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Admin Create Booking Error:", error);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  }
};

export const billplzCallback = async (req, res) => {
  try {
    const {
      id,                    
      paid_amount,
      paid_at,
      paid,                  
    } = req.body;

    console.log("Billplz Callback Received:", req.body);

    const xSignature = req.body.x_signature;

    const isValidSignature = verifyBillplzSignature(req.body, xSignature, process.env.BILLPLZ_X_SIGNATURE);

    if (!isValidSignature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: "No bill id provided" });
    }

    const payment = await Payment.findOne({ gatewayTransactionId: id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    const booking = await Booking.findById(payment.booking)
      .populate("graduate", "fullName email phone")
      .populate("package", "name price services")
      .populate("addons", "name price");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const session = await Session.findById(booking.session);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const isPaid = paid === "true";
    const wasAlreadyPaid = payment.paymentStatus === "paid" || booking.paymentStatus === "paid";

    payment.paidAmount = paid_amount ? paid_amount / 100 : 0;
    payment.paymentStatus = isPaid ? "paid" : "failed";
    if (isPaid) payment.paidAt = new Date();
    await payment.save();

    // Update booking status
    if (isPaid) {
      booking.status = "booked";
      booking.paymentStatus = "paid";
      booking.totalPrice = payment.paidAmount;
      if (!wasAlreadyPaid) {
        session.bookedCount += 1;
        session.status = session.bookedCount >= session.capacity ? "full" : "available";
        await session.save();
      }
      sendBookingConfirmation(booking).catch((err) => {
        console.error("Email failed but booking already updated:", err);
      });
    } else {
      booking.status = "pending";
      booking.paymentStatus = "failed";
    }

    await booking.save();

    console.log(`Booking ${booking.bookingNumber} payment status updated to ${payment.paymentStatus}`);
    res.status(200).json({ success: true, message: "Callback processed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const verifyBillplzSignature = (payload, xSignature, secretKey) => {
  const data = { ...payload };

  delete data.x_signature;

  const sourceArray = Object.keys(data).map(
    (key) => `${key}${data[key] ?? ""}`
  );

  sourceArray.sort();

  const sourceString = sourceArray.join("|");

  console.log("📌 Source String:", sourceString);

  const generatedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(sourceString)
    .digest("hex");

  console.log("Generated Signature:", generatedSignature);
  console.log("Billplz Signature:", xSignature);

  return generatedSignature === xSignature;
};