// controllers/queueController.js
import Queue from "../models/Queue.js";
import Booking from "../models/Booking.js";
import Studio from "../models/Studio.js";
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
      return res.status(400).json({ 
        success: false, 
        message: "queueId is required" 
      });
    }

    // Find the queue entry and populate studio info if needed
    const queueEntry = await Queue.findById(queueId)
      .populate("booking", "");

    if (!queueEntry) {
      return res.status(404).json({ 
        success: false, 
        message: "Queue entry not found" 
      });
    }

    if (queueEntry.status !== "called") {
      return res.status(400).json({ 
        success: false, 
        message: "Customer must be called first before confirming arrival" 
      });
    }

    // === Update Queue to "in-progress" ===
    queueEntry.status = "in-progress";
    queueEntry.startTime = new Date();
    await queueEntry.save();

    // === Update Studio to Occupied ===
    if (queueEntry.studio) {
      await Studio.findByIdAndUpdate(
        queueEntry.studio,
        { isOccupied: true, currentBooking: queueEntry.booking },
        { new: true }
      );
    }

    // === Update Booking status ===
    if (queueEntry.booking) {
      await Booking.findByIdAndUpdate(queueEntry.booking, { 
        status: "in-progress" 
      });
    }

    // Broadcast live update to all clients
    await broadcastQueueUpdate();

    res.json({
      success: true,
      message: "Arrival confirmed. Studio is now occupied.",
      data: queueEntry,
    });
  } catch (error) {
    console.error("Confirm Arrival Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to confirm arrival" 
    });
  }
};

// ====================== CHECK-OUT ======================
export const checkOut = async (req, res) => {
  try {
    const { queueId } = req.body;

    if (!queueId) {
      return res.status(400).json({ 
        success: false, 
        message: "queueId is required" 
      });
    }

    const queueEntry = await Queue.findById(queueId);

    if (!queueEntry) {
      return res.status(404).json({ 
        success: false, 
        message: "Queue entry not found" 
      });
    }

    // 1. Update Queue status to completed
    queueEntry.status = "completed";
    queueEntry.endTime = new Date();
    await queueEntry.save();

    // 2. Update Studio → isOccupied = false
    if (queueEntry.studio) {
      await Studio.findByIdAndUpdate(
        queueEntry.studio,
        { isOccupied: false, currentBooking: null },
        { new: true }
      );
    }

    // 3. Update Booking status
    if (queueEntry.booking) {
      await Booking.findByIdAndUpdate(queueEntry.booking, { 
        status: "completed" 
      });
    }

    // Broadcast live update to all clients
    await broadcastQueueUpdate();

    res.json({
      success: true,
      message: "Check-out successful. Studio is now free.",
    });
  } catch (error) {
    console.error("Check-out Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to check-out" 
    });
  }
};

// ====================== SKIP CUSTOMER (Staff re-queues a no-show) ======================
export const skipCustomer = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }

    const queueEntry = await Queue.findOne({ booking: bookingId });

    if (!queueEntry) {
      return res.status(404).json({ success: false, message: "Queue entry not found" });
    }

    if (queueEntry.status !== "called") {
      return res.status(400).json({
        success: false,
        message: "Only a customer in 'called' status can be skipped",
      });
    }

    queueEntry.status = "waiting";
    queueEntry.studio = null;
    queueEntry.skippedCount += 1;
    await queueEntry.save();

    await broadcastQueueUpdate();

    res.json({
      success: true,
      message: "Customer skipped and moved to end of queue",
      data: queueEntry,
    });
  } catch (error) {
    console.error("Skip Customer Error:", error);
    res.status(500).json({ success: false, message: "Failed to skip customer" });
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