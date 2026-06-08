import { jest, describe, it, expect, beforeEach } from "@jest/globals";

jest.mock("../../src/models/Session.js", () => ({
  __esModule: true,
  default: {
    insertMany: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

import Session from "../../src/models/Session.js";
import {
  generateSessions,
  listSessions,
  updateSession,
  deleteSession,
} from "../../src/services/sessionService.js";

const BASE_INPUT = {
  fromDate: "2025-10-01",
  toDate: "2025-10-01",
  startTime: "09:00",
  endTime: "11:00",
  duration: 30,
  capacity: 5,
};

// ─────────────────────────────────────────────────────────────────────────────
// generateSessions — Branch Testing
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] generateSessions — required field and date validation branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when fromDate is missing", async () => {
    const { fromDate: _o, ...input } = BASE_INPUT;
    await expect(generateSessions(input)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when toDate is missing", async () => {
    const { toDate: _o, ...input } = BASE_INPUT;
    await expect(generateSessions(input)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when startTime is missing", async () => {
    const { startTime: _o, ...input } = BASE_INPUT;
    await expect(generateSessions(input)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when endTime is missing", async () => {
    const { endTime: _o, ...input } = BASE_INPUT;
    await expect(generateSessions(input)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when duration is missing", async () => {
    const { duration: _o, ...input } = BASE_INPUT;
    await expect(generateSessions(input)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 when capacity is missing", async () => {
    const { capacity: _o, ...input } = BASE_INPUT;
    await expect(generateSessions(input)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 400 for invalid date format — isNaN check branch", async () => {
    await expect(generateSessions({ ...BASE_INPUT, fromDate: "not-a-date" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Invalid date format" });
  });

  it("throws 400 when fromDate is after toDate — date comparison branch", async () => {
    await expect(generateSessions({ ...BASE_INPUT, fromDate: "2025-10-05", toDate: "2025-10-01" }))
      .rejects.toMatchObject({ statusCode: 400, message: "fromDate must be before toDate" });
  });

  it("throws 400 when startTime equals endTime — empty slot list branch", async () => {
    await expect(generateSessions({ ...BASE_INPUT, startTime: "09:00", endTime: "09:00" }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("[Branch] generateSessions — break window skipping branches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Session.insertMany.mockResolvedValue([]);
  });

  it("skips slots that fall entirely inside the break window (current >= breakStart && current < breakEnd)", async () => {
    // 09:00–13:00, 60-min slots, break 11:00–12:00 → only 09:00, 10:00, 12:00 generated
    await generateSessions({
      ...BASE_INPUT,
      startTime: "09:00",
      endTime: "13:00",
      duration: 60,
      breakStartTime: "11:00",
      breakEndTime: "12:00",
    });
    const starts = Session.insertMany.mock.calls[0][0].map((d) => d.startTime);
    expect(starts).toContain("09:00");
    expect(starts).toContain("10:00");
    expect(starts).toContain("12:00");
    expect(starts).not.toContain("11:00");
  });

  it("skips slots where slot end falls inside the break (slotEnd > breakStart && slotEnd <= breakEnd)", async () => {
    // 10:00–12:30, 30-min, break 10:30–11:30 → skip 10:30 and 11:00
    await generateSessions({
      ...BASE_INPUT,
      startTime: "10:00",
      endTime: "12:30",
      duration: 30,
      breakStartTime: "10:30",
      breakEndTime: "11:30",
    });
    const starts = Session.insertMany.mock.calls[0][0].map((d) => d.startTime);
    expect(starts).toContain("10:00");
    expect(starts).not.toContain("10:30");
    expect(starts).not.toContain("11:00");
    expect(starts).toContain("11:30");
  });

  it("generates all slots when no break window is provided (breakStart/breakEnd undefined)", async () => {
    await generateSessions({ ...BASE_INPUT, breakStartTime: undefined, breakEndTime: undefined });
    const docs = Session.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateSessions — Data Flow Testing
// ─────────────────────────────────────────────────────────────────────────────

describe("[DataFlow] generateSessions — slot time computation and batchId propagation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Session.insertMany.mockResolvedValue([]);
  });

  it("startTime and duration → slot start/end times computed correctly for each iteration", async () => {
    await generateSessions(BASE_INPUT);
    const docs = Session.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(4);
    expect(docs[0].startTime).toBe("09:00");
    expect(docs[0].endTime).toBe("09:30");
    expect(docs[3].startTime).toBe("10:30");
    expect(docs[3].endTime).toBe("11:00");
  });

  it("batchId generated once and propagated to every session in the batch (single definition, multiple uses)", async () => {
    await generateSessions({ ...BASE_INPUT, toDate: "2025-10-02" });
    const docs = Session.insertMany.mock.calls[0][0];
    const batchIds = [...new Set(docs.map((d) => d.batchId))];
    expect(batchIds).toHaveLength(1);
    expect(batchIds[0]).toMatch(/^batch_/);
  });

  it("capacity input is coerced to Number before being stored in each session document", async () => {
    await generateSessions({ ...BASE_INPUT, capacity: "10" });
    const docs = Session.insertMany.mock.calls[0][0];
    docs.forEach((d) => expect(typeof d.capacity).toBe("number"));
    expect(docs[0].capacity).toBe(10);
  });

  it("all sessions initialised with bookedCount = 0 and status = 'available'", async () => {
    await generateSessions(BASE_INPUT);
    Session.insertMany.mock.calls[0][0].forEach((d) => {
      expect(d.bookedCount).toBe(0);
      expect(d.status).toBe("available");
    });
  });

  it("slot generation spans multiple days — date increments correctly each iteration", async () => {
    await generateSessions({ ...BASE_INPUT, toDate: "2025-10-02" });
    const docs = Session.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listSessions
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] listSessions — date filter branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses empty filter when no date provided (if(date) false branch)", async () => {
    const chain = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
    Session.find.mockReturnValue(chain);
    await listSessions({});
    expect(Session.find).toHaveBeenCalledWith({});
  });

  it("throws 400 for invalid date format (isNaN branch)", async () => {
    await expect(listSessions({ date: "not-a-date" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Invalid date format. Use YYYY-MM-DD" });
  });

  it("applies midnight-to-midnight $gte/$lte filter when date is valid (if(date) true branch)", async () => {
    const chain = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
    Session.find.mockReturnValue(chain);
    await listSessions({ date: "2025-10-01" });
    const filterArg = Session.find.mock.calls[0][0];
    expect(filterArg.date.$gte.getHours()).toBe(0);
    expect(filterArg.date.$lte.getHours()).toBe(23);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateSession / deleteSession
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] updateSession — field whitelist enforcement", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when session not found (null result branch)", async () => {
    Session.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(updateSession("nonexistent-id", { status: "full" })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("strips non-whitelisted fields (bookedCount, batchId) from the DB update payload", async () => {
    Session.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: "s1" }) });
    await updateSession("s1", { status: "full", capacity: 10, bookedCount: 99, batchId: "hack" });
    const payload = Session.findByIdAndUpdate.mock.calls[0][1];
    expect(payload.status).toBe("full");
    expect(payload.capacity).toBe(10);
    expect(payload.bookedCount).toBeUndefined();
    expect(payload.batchId).toBeUndefined();
  });
});

describe("[Path] updateSession / deleteSession — not found vs success paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deleteSession Path 1 — throws 404 when session does not exist", async () => {
    Session.findByIdAndDelete.mockResolvedValue(null);
    await expect(deleteSession("nonexistent-id")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("deleteSession Path 2 — resolves without error when session exists", async () => {
    Session.findByIdAndDelete.mockResolvedValue({ _id: "s1" });
    await expect(deleteSession("s1")).resolves.toBeUndefined();
  });
});
