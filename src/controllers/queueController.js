// controllers/queueController.js
import Queue from "../models/Queue.js";
import Booking from "../models/Booking.js";
import { broadcastQueueUpdate } from "../config/socket.js";

// ====================== CHECK-IN (Registration Counter) ======================
export const checkIn = async (req, res) => {
  try {
    const { bookingNumber } = req.body;

    if (!bookingNumber) {
      return res.status(400).json({ success: false, message: "bookingNumber is required" });
    }

    const booking = await Booking.findOne({ bookingNumber })
      .populate("graduate", "fullName email phone");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Prevent duplicate check-in
    const existing = await Queue.findOne({ booking: booking._id });
    if (existing) {
      return res.status(400).json({ success: false, message: "This booking is already checked in" });
    }

    const queueEntry = await Queue.create({
      booking: booking._id,
      status: "waiting",
    });

    booking.status = "checked-in";
    await booking.save();

    await broadcastQueueUpdate();

    res.json({
      success: true,
      message: "Check-in successful",
      data: queueEntry,
    });
  } catch (error) {
    console.error("Check-in Error:", error);
    res.status(500).json({ success: false, message: "Server error during check-in" });
  }
};

// ====================== CALL NEXT (Studio Counter) ======================
export const callNext = async (req, res) => {
  try {
    const { studioId } = req.body;

    if (!studioId) {
      return res.status(400).json({ success: false, message: "studioId is required" });
    }

    const nextQueue = await Queue.getNextWaiting();

    if (!nextQueue) {
      return res.status(404).json({ success: false, message: "No customers waiting in queue" });
    }

    nextQueue.status = "called";
    nextQueue.studio = studioId;
    await nextQueue.save();

    await broadcastQueueUpdate();

    res.json({
      success: true,
      message: "Next customer called successfully",
      data: nextQueue,
    });
  } catch (error) {
    console.error("Call Next Error:", error);
    res.status(500).json({ success: false, message: "Failed to call next customer" });
  }
};

// ====================== CONFIRM ARRIVAL (Customer scans QR at studio) ======================
export const confirmArrival = async (req, res) => {
  try {
    const { queueId } = req.body;

    if (!queueId) {
      return res.status(400).json({ success: false, message: "queueId is required" });
    }

    const queueEntry = await Queue.findById(queueId);

    if (!queueEntry) {
      return res.status(404).json({ success: false, message: "Queue entry not found" });
    }

    if (queueEntry.status !== "called") {
      return res.status(400).json({ 
        success: false, 
        message: "Customer must be called first" 
      });
    }

    queueEntry.status = "in-progress";
    queueEntry.startTime = new Date();
    await queueEntry.save();

    await Booking.findByIdAndUpdate(queueEntry.booking, { status: "in-progress" });

    await broadcastQueueUpdate();

    res.json({
      success: true,
      message: "Arrival confirmed. Session started.",
      data: queueEntry,
    });
  } catch (error) {
    console.error("Confirm Arrival Error:", error);
    res.status(500).json({ success: false, message: "Failed to confirm arrival" });
  }
};

// ====================== CHECK-OUT ======================
export const checkOut = async (req, res) => {
  try {
    const { queueId } = req.body;

    if (!queueId) {
      return res.status(400).json({ success: false, message: "queueId is required" });
    }

    const queueEntry = await Queue.findById(queueId);

    if (!queueEntry) {
      return res.status(404).json({ success: false, message: "Queue entry not found" });
    }

    queueEntry.status = "completed";
    queueEntry.endTime = new Date();
    await queueEntry.save();

    await Booking.findByIdAndUpdate(queueEntry.booking, { status: "completed" });

    await broadcastQueueUpdate();

    res.json({
      success: true,
      message: "Check-out successful",
    });
  } catch (error) {
    console.error("Check-out Error:", error);
    res.status(500).json({ success: false, message: "Failed to check-out" });
  }
};

// ====================== GET ACTIVE QUEUE ======================
export const getActiveQueue = async (req, res) => {
  try {
    const activeQueue = await Queue.getActiveQueue();
    res.json({
      success: true,
      data: activeQueue,
      count: activeQueue.length,
    });
  } catch (error) {
    console.error("getActiveQueue Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};