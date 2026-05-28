import { addDays, format, parse } from "date-fns";
import Session from "../models/Session.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound() {
  const err = new Error("Session not found");
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

// Pure function — generates time slot pairs for a single day, skipping break
function generateTimeSlots(startTimeStr, endTimeStr, duration, breakStartStr, breakEndStr) {
  const slots = [];
  let current = parse(startTimeStr, "HH:mm", new Date());
  const end = parse(endTimeStr, "HH:mm", new Date());
  const breakStart = breakStartStr ? parse(breakStartStr, "HH:mm", new Date()) : null;
  const breakEnd = breakEndStr ? parse(breakEndStr, "HH:mm", new Date()) : null;

  while (current < end) {
    const slotEnd = new Date(current.getTime() + duration * 60000);

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

    slots.push({ startTime: format(current, "HH:mm"), endTime: format(slotEnd, "HH:mm") });
    current = slotEnd;
  }

  return slots;
}

// ─── Session Service ──────────────────────────────────────────────────────────

// Fields an admin can manually adjust on an existing session.
// bookedCount and batchId are system-managed — not user-editable.
const SESSION_UPDATE_FIELDS = ["date", "startTime", "endTime", "duration", "capacity", "status"];

export async function generateSessions({
  fromDate,
  toDate,
  startTime,
  endTime,
  breakStartTime,
  breakEndTime,
  duration,
  capacity,
}) {
  if (!fromDate || !toDate || !startTime || !endTime || !duration || !capacity) {
    throw badRequest("fromDate, toDate, startTime, endTime, duration and capacity are required");
  }

  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw badRequest("Invalid date format");
  }
  if (startDate > endDate) {
    throw badRequest("fromDate must be before toDate");
  }

  const batchId = `batch_${Date.now()}`;
  const docs = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const slots = generateTimeSlots(startTime, endTime, duration, breakStartTime, breakEndTime);

    for (const slot of slots) {
      docs.push({
        date: new Date(currentDate),
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: Number(duration),
        capacity: Number(capacity),
        bookedCount: 0,
        status: "available",
        batchId,
      });
    }

    currentDate = addDays(currentDate, 1);
  }

  if (docs.length === 0) {
    throw badRequest("No time slots could be generated with the given parameters");
  }

  // Bulk insert — far more efficient than creating one-by-one in a loop
  const sessions = await Session.insertMany(docs);
  return { sessions, batchId };
}

export async function listSessions({ date } = {}) {
  const filter = {};

  if (date) {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) throw badRequest("Invalid date format. Use YYYY-MM-DD");

    filter.date = {
      $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
      $lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
    };
  }

  return Session.find(filter)
    .select("-__v -createdAt -updatedAt")
    .sort({ date: 1, startTime: 1 })
    .lean();
}

export async function updateSession(id, body) {
  const allowed = {};
  for (const key of SESSION_UPDATE_FIELDS) {
    if (body[key] !== undefined) allowed[key] = body[key];
  }

  const session = await Session.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).lean();
  if (!session) throw notFound();
  return session;
}

export async function deleteSession(id) {
  const session = await Session.findByIdAndDelete(id);
  if (!session) throw notFound();
}
