import * as queueService from "../services/queueService.js";

export const getActiveQueue = async (req, res, next) => {
  try {
    const data = await queueService.getActiveQueue();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    next(err);
  }
};

export const checkIn = async (req, res, next) => {
  try {
    const data = await queueService.checkIn(req.body.bookingNumber);
    res.json({ success: true, message: "Check-in successful", data });
  } catch (err) {
    next(err);
  }
};

export const callNext = async (req, res, next) => {
  try {
    const data = await queueService.callNext(req.body.studioId);
    res.json({ success: true, message: "Next customer called successfully", data });
  } catch (err) {
    next(err);
  }
};

export const confirmArrival = async (req, res, next) => {
  try {
    const data = await queueService.confirmArrival(req.body.queueId);
    res.json({ success: true, message: "Arrival confirmed. Studio is now occupied.", data });
  } catch (err) {
    next(err);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    await queueService.checkOut(req.body.queueId);
    res.json({ success: true, message: "Check-out successful. Studio is now free." });
  } catch (err) {
    next(err);
  }
};

export const skipCustomer = async (req, res, next) => {
  try {
    const data = await queueService.skipCustomer(req.body.bookingId);
    res.json({ success: true, message: "Customer skipped and moved to end of queue", data });
  } catch (err) {
    next(err);
  }
};
