import Session from "../models/Session.js";
import { addDays, format, parse, isWithinInterval } from "date-fns";

// Helper: Generate time slots for one day, skipping break time
const generateTimeSlots = (startTimeStr, endTimeStr, duration, breakStartStr, breakEndStr) => {
  const slots = [];
  let current = parse(startTimeStr, "HH:mm", new Date());
  const end = parse(endTimeStr, "HH:mm", new Date());

  const breakStart = breakStartStr ? parse(breakStartStr, "HH:mm", new Date()) : null;
  const breakEnd = breakEndStr ? parse(breakEndStr, "HH:mm", new Date()) : null;

  while (current < end) {
    const slotEnd = new Date(current.getTime() + duration * 60000);

    // Skip if slot overlaps with break time
    if (breakStart && breakEnd) {
      const overlapsBreak = 
        (current >= breakStart && current < breakEnd) ||
        (slotEnd > breakStart && slotEnd <= breakEnd) ||
        (current < breakStart && slotEnd > breakEnd);

      if (overlapsBreak) {
        current = slotEnd;
        continue;
      }
    }

    slots.push({
      startTime: format(current, "HH:mm"),
      endTime: format(slotEnd, "HH:mm"),
    });

    current = slotEnd;
  }

  return slots;
};

export const generateSessions = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      startTime,
      endTime,
      breakStartTime,
      breakEndTime,
      duration,
      capacity,
    } = req.body;

    if (!fromDate || !toDate || !startTime || !endTime || !duration || !capacity) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const batchId = `batch_${Date.now()}`;

    const generatedSessions = [];

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const timeSlots = generateTimeSlots(
        startTime, 
        endTime, 
        duration, 
        breakStartTime, 
        breakEndTime
      );

      for (const slot of timeSlots) {
        const session = await Session.create({
          date: currentDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: Number(duration),
          capacity: Number(capacity),
          bookedCount: 0,
          status: "available",
          batchId,
        });

        generatedSessions.push(session);
      }

      currentDate = addDays(currentDate, 1);
    }

    res.status(201).json({
      success: true,
      message: `Successfully generated ${generatedSessions.length} sessions`,
      count: generatedSessions.length,
      batchId,
      data: generatedSessions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to generate sessions" });
  }
};

export const getAllSessions = async (req, res) => {
  try {
    const { date } = req.query;
    let filter = {};

    if (date) {
      // Validate date format
      const parsedDate = new Date(date);
      
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD"
        });
      }

      // Use start of day to end of day to avoid timezone issues
      const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

      filter.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    const sessions = await Session.find(filter)
      .select("-__v -createdAt -updatedAt")
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error("Get All Sessions Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const updateSession = async (req, res) => {
  try {
    const session = await Session.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.json({
      success: true,
      message: "Session updated successfully",
      data: session,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.json({ 
      success: true, 
      message: "Session deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};