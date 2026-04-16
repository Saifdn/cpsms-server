import Queue from "../models/Queue.js";
import Booking from "../models/Booking.js";
import Studio from "../models/Studio.js";

// ====================== CHECK-IN ======================
export const checkIn = async (req, res) => {
  try {
    const { bookingNumber } = req.body;

    if (!bookingNumber) {
      return res.status(400).json({ success: false, message: "bookingNumber is required" });
    }

    const booking = await Booking.findOne({ bookingNumber });
    if (!booking) {
      return res.status(404).json({ success: false, message: `Booking ${bookingNumber} not found` });
    }

    if (booking.status === "checked-in" || booking.status === "in-progress") {
      return res.status(400).json({ success: false, message: "Booking already checked in" });
    }

    const queueEntry = await Queue.create({
      booking: booking._id,
      studio: null,
      status: "waiting",
      checkInTime: new Date(),
    });

    booking.status = "checked-in";
    booking.queue = queueEntry._id;
    booking.checkInTime = new Date();
    await booking.save();

    res.status(201).json({
      success: true,
      message: "Check-in successful",
      queueNumber: queueEntry.queueNumber,
      data: { booking, queue: queueEntry }
    });

  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during check-in",
      error: error.message 
    });
  }
};

// ====================== CALL NEXT ======================
// Called when a studio becomes available (after previous user checks out)
export const callNext = async (req, res) => {
  try {
    const { studioId } = req.body;

    // 1. Find the next waiting person
    const nextQueue = await Queue.getNextWaiting()
      .populate({
        path: "booking",
        populate: [
          { path: "graduate", select: "fullName email" },
          { path: "package", select: "name" }
        ]
      });

    if (!nextQueue) {
      return res.json({ success: true, message: "No one is waiting in queue" });
    }

    // 2. Assign studio to this queue
    nextQueue.studio = studioId;
    nextQueue.status = "called";        // or "in-progress"
    nextQueue.startTime = new Date();
    await nextQueue.save();

    // 3. Update Studio status to occupied
    await Studio.findByIdAndUpdate(studioId, { 
      isAvailable: false,
      currentQueue: nextQueue._id 
    });

    // 4. Update Booking status
    await Booking.findByIdAndUpdate(nextQueue.booking, {
      status: "in-progress",
      checkInTime: nextQueue.checkInTime
    });

    res.json({
      success: true,
      message: `Called queue number ${nextQueue.queueNumber}`,
      data: nextQueue,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to call next" });
  }
};

// ====================== CHECK-OUT ======================
// When user finishes session
export const checkOut = async (req, res) => {
  try {
    const { queueId } = req.body;

    const queue = await Queue.findById(queueId);
    if (!queue) {
      return res.status(404).json({ success: false, message: "Queue entry not found" });
    }

    // 1. Mark queue as completed
    queue.status = "completed";
    queue.endTime = new Date();
    await queue.save();

    // 2. Free the studio
    if (queue.studio) {
      await Studio.findByIdAndUpdate(queue.studio, {
        isAvailable: true,
        currentQueue: null
      });
    }

    // 3. Mark booking as completed
    await Booking.findByIdAndUpdate(queue.booking, {
      status: "completed",
      checkOutTime: new Date()
    });

    // 4. Automatically call next person (optional but recommended)
    // You can call callNext() here if you want automatic flow

    res.json({
      success: true,
      message: "Check-out successful. Studio is now available.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error during check-out" });
  }
};

// Get current active queue (for waiting screen)
export const getActiveQueue = async (req, res) => {
  try {
    const activeQueue = await Queue.getActiveQueue();   // ← This now uses the static

    res.json({
      success: true,
      data: activeQueue,
      count: activeQueue.length,
    });
  } catch (error) {
    console.error("getActiveQueue Error:", error);   // ← Important for debugging
    res.status(500).json({
      success: false,
      message: "Server error while fetching active queue",
      error: error.message,   // Remove in production
    });
  }
};