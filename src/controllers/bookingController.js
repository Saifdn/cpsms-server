import Booking from "../models/Booking.js";
import Session from "../models/Session.js";

// Get all bookings (with optional filters)
export const getAllBookings = async (req, res) => {
  try {
    const { status, graduate } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (graduate) filter.graduate = graduate;

    const bookings = await Booking.find(filter)
      .populate("graduate", "fullName email phone")
      .populate("package", "name price")
      .populate("session", "date startTime endTime")
      // .populate("studio", "name location")
      .sort({ bookedAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
  res.status(500).json({
    success: false,
    message: error.message,
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
      .populate("session", "date startTime endTime");

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

// Create new booking (usually done by system when graduate books)
export const createBooking = async (req, res) => {
  const sessionId = req.body.session;

  try {
    // 1. Find session
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // 2. Check capacity
    if (session.bookedCount >= session.capacity) {
      return res.status(400).json({
        success: false,
        message: "Session is fully booked",
      });
    }

    // 3. Create booking
    const booking = await Booking.create(req.body);

    // 4. Increment bookedCount
    session.bookedCount += 1;
    await session.save();

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
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

    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};