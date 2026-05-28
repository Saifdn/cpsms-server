import * as bookingService from "../services/bookingService.js";

export const getMyBookings = async (req, res, next) => {
  try {
    const data = await bookingService.getMyBookings(req.user.userId, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMyBookingById = async (req, res, next) => {
  try {
    const data = await bookingService.getMyBookingById(req.user.userId, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getAllBookings = async (req, res, next) => {
  try {
    const result = await bookingService.getAllBookings(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const data = await bookingService.getBookingById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getBookingByNumber = async (req, res, next) => {
  try {
    const data = await bookingService.getBookingByNumber(req.params.bookingNumber);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const result = await bookingService.createBooking(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "Booking created. Redirecting to payment...",
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const adminCreateBooking = async (req, res, next) => {
  try {
    const data = await bookingService.adminCreateBooking(req.body);
    res.status(201).json({
      success: true,
      message: "Booking created and payment recorded successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateBooking = async (req, res, next) => {
  try {
    const data = await bookingService.updateBooking(req.params.id, req.body);
    res.json({ success: true, message: "Booking updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    await bookingService.cancelBooking(req.params.id);
    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (err) {
    next(err);
  }
};

export const billplzCallback = async (req, res, next) => {
  try {
    await bookingService.handleBillplzCallback(req.body);
    res.json({ success: true, message: "Callback processed successfully" });
  } catch (err) {
    next(err);
  }
};
