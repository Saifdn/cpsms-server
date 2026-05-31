import Queue from "../models/Queue.js";
import Booking from "../models/Booking.js";
import Studio from "../models/Studio.js";
import { broadcastQueueUpdate } from "../config/socket.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound(message = "Queue entry not found") {
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

// ─── Queue Service ────────────────────────────────────────────────────────────

export async function getActiveQueue() {
  return Queue.getActiveQueue();
}

export async function checkIn(bookingNumber) {
  if (!bookingNumber) throw badRequest("bookingNumber is required");

  const booking = await Booking.findOne({ bookingNumber }).populate("graduate", "fullName email phone");
  if (!booking) throw notFound("Booking not found");

  const existing = await Queue.findOne({ booking: booking._id });
  if (existing) throw badRequest("This booking is already checked in");

  const queueEntry = await Queue.create({ booking: booking._id, status: "waiting" });

  booking.status = "checked-in";
  await booking.save();
  await broadcastQueueUpdate();

  return { queueNumber: queueEntry.queueNumber };
}

export async function callNext(studioId) {
  if (!studioId) throw badRequest("studioId is required");

  const nextQueue = await Queue.getNextWaiting();
  if (!nextQueue) throw notFound("No customers waiting in queue");

  nextQueue.status = "called";
  nextQueue.studio = studioId;
  await nextQueue.save();
  await broadcastQueueUpdate();

  return nextQueue;
}

export async function confirmArrival(queueId) {
  if (!queueId) throw badRequest("queueId is required");

  // No populate needed — booking field is only used as an ID for subsequent updates
  const queueEntry = await Queue.findById(queueId);
  if (!queueEntry) throw notFound();

  if (queueEntry.status !== "called") {
    throw badRequest("Customer must be called first before confirming arrival");
  }

  queueEntry.status = "in-progress";
  queueEntry.startTime = new Date();
  await queueEntry.save();

  if (queueEntry.studio) {
    await Studio.findByIdAndUpdate(queueEntry.studio, {
      isOccupied: true,
      currentBooking: queueEntry.booking,
    });
  }

  if (queueEntry.booking) {
    await Booking.findByIdAndUpdate(queueEntry.booking, { status: "in-progress" });
  }

  await broadcastQueueUpdate();
  return queueEntry;
}

export async function checkOut(queueId) {
  if (!queueId) throw badRequest("queueId is required");

  const queueEntry = await Queue.findById(queueId);
  if (!queueEntry) throw notFound();

  queueEntry.status = "completed";
  queueEntry.endTime = new Date();
  await queueEntry.save();

  if (queueEntry.studio) {
    await Studio.findByIdAndUpdate(queueEntry.studio, { isOccupied: false, currentBooking: null });
  }

  if (queueEntry.booking) {
    await Booking.findByIdAndUpdate(queueEntry.booking, { status: "completed" });
  }

  await broadcastQueueUpdate();
}

export async function skipCustomer(bookingId) {
  if (!bookingId) throw badRequest("bookingId is required");

  const queueEntry = await Queue.findOne({ booking: bookingId });
  if (!queueEntry) throw notFound();

  if (queueEntry.status !== "called") {
    throw badRequest("Only a customer in 'called' status can be skipped");
  }

  queueEntry.status = "waiting";
  queueEntry.studio = null;
  queueEntry.skippedCount += 1;
  await queueEntry.save();
  await broadcastQueueUpdate();

  return queueEntry;
}
