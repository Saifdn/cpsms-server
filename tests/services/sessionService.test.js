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

describe("generateSessions — required field validation", () => {
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

  it("throws 400 for invalid date format in fromDate", async () => {
    await expect(generateSessions({ ...BASE_INPUT, fromDate: "not-a-date" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Invalid date format" });
  });

  it("throws 400 when fromDate is after toDate", async () => {
    await expect(generateSessions({ ...BASE_INPUT, fromDate: "2025-10-05", toDate: "2025-10-01" }))
      .rejects.toMatchObject({ statusCode: 400, message: "fromDate must be before toDate" });
  });

  it("throws 400 when no slots can be generated (startTime equals endTime)", async () => {
    await expect(generateSessions({ ...BASE_INPUT, startTime: "09:00", endTime: "09:00" }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("generateSessions — slot generation logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Session.insertMany.mockResolvedValue([]);
  });

  it("generates 4 slots for 09:00–11:00 with 30-min duration on one day", async () => {
    await generateSessions(BASE_INPUT);
    const docs = Session.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(4);
    expect(docs[0].startTime).toBe("09:00");
    expect(docs[0].endTime).toBe("09:30");
    expect(docs[3].startTime).toBe("10:30");
    expect(docs[3].endTime).toBe("11:00");
  });

  it("generates slots across multiple days (2 days × 4 slots = 8 docs)", async () => {
    await generateSessions({ ...BASE_INPUT, toDate: "2025-10-02" });
    const docs = Session.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(8);
  });

  it("all generated sessions have status 'available' and bookedCount 0", async () => {
    await generateSessions(BASE_INPUT);
    const docs = Session.insertMany.mock.calls[0][0];
    docs.forEach((d) => {
      expect(d.status).toBe("available");
      expect(d.bookedCount).toBe(0);
    });
  });

  it("all sessions in a call share the same batchId", async () => {
    await generateSessions({ ...BASE_INPUT, toDate: "2025-10-02" });
    const docs = Session.insertMany.mock.calls[0][0];
    const batchIds = [...new Set(docs.map((d) => d.batchId))];
    expect(batchIds).toHaveLength(1);
    expect(batchIds[0]).toMatch(/^batch_/);
  });

  it("returns the batchId and sessions in the result", async () => {
    const fakeSession = { _id: "s1" };
    Session.insertMany.mockResolvedValue([fakeSession]);
    const result = await generateSessions(BASE_INPUT);
    expect(result.batchId).toMatch(/^batch_/);
    expect(result.sessions).toEqual([fakeSession]);
  });
});

describe("generateSessions — break window skipping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Session.insertMany.mockResolvedValue([]);
  });

  it("skips slots that fall entirely within the break window", async () => {
    // 09:00–13:00, 60-min slots, break 11:00–12:00 → 09:00, 10:00, 12:00 (3 slots)
    await generateSessions({
      ...BASE_INPUT,
      startTime: "09:00",
      endTime: "13:00",
      duration: 60,
      breakStartTime: "11:00",
      breakEndTime: "12:00",
    });
    const docs = Session.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(3);
    const starts = docs.map((d) => d.startTime);
    expect(starts).toContain("09:00");
    expect(starts).toContain("10:00");
    expect(starts).toContain("12:00");
    expect(starts).not.toContain("11:00");
  });

  it("skips slots where slot start is inside the break window", async () => {
    // 10:00–12:30, 30-min, break 10:30–11:30 → 10:00 ok, 10:30+11:00 skipped, 11:30+12:00 ok
    await generateSessions({
      ...BASE_INPUT,
      startTime: "10:00",
      endTime: "12:30",
      duration: 30,
      breakStartTime: "10:30",
      breakEndTime: "11:30",
    });
    const docs = Session.insertMany.mock.calls[0][0];
    const starts = docs.map((d) => d.startTime);
    expect(starts).toContain("10:00");
    expect(starts).not.toContain("10:30");
    expect(starts).not.toContain("11:00");
    expect(starts).toContain("11:30");
    expect(starts).toContain("12:00");
  });

  it("generates all slots when no break is provided", async () => {
    await generateSessions({ ...BASE_INPUT, breakStartTime: undefined, breakEndTime: undefined });
    const docs = Session.insertMany.mock.calls[0][0];
    expect(docs).toHaveLength(4);
  });
});

describe("listSessions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("queries with empty filter when no date is provided", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    Session.find.mockReturnValue(chain);

    await listSessions({});
    expect(Session.find).toHaveBeenCalledWith({});
  });

  it("throws 400 for invalid date format in filter", async () => {
    await expect(listSessions({ date: "not-a-date" }))
      .rejects.toMatchObject({ statusCode: 400, message: "Invalid date format. Use YYYY-MM-DD" });
  });

  it("applies midnight-to-midnight date filter when date is valid", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    Session.find.mockReturnValue(chain);

    await listSessions({ date: "2025-10-01" });

    const filterArg = Session.find.mock.calls[0][0];
    expect(filterArg.date.$gte).toBeInstanceOf(Date);
    expect(filterArg.date.$lte).toBeInstanceOf(Date);
    expect(filterArg.date.$gte.getHours()).toBe(0);
    expect(filterArg.date.$lte.getHours()).toBe(23);
  });
});

describe("updateSession", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when session not found", async () => {
    Session.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(updateSession("nonexistent-id", { status: "full" }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("only passes whitelisted SESSION_UPDATE_FIELDS to the DB", async () => {
    const fakeSession = { _id: "s1", status: "full" };
    Session.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(fakeSession) });

    await updateSession("s1", {
      status: "full",
      capacity: 10,
      bookedCount: 99,
      batchId: "hack",
      malicious: "field",
    });

    const updatePayload = Session.findByIdAndUpdate.mock.calls[0][1];
    expect(updatePayload.status).toBe("full");
    expect(updatePayload.capacity).toBe(10);
    expect(updatePayload.bookedCount).toBeUndefined();
    expect(updatePayload.batchId).toBeUndefined();
    expect(updatePayload.malicious).toBeUndefined();
  });
});

describe("deleteSession", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when session not found", async () => {
    Session.findByIdAndDelete.mockResolvedValue(null);
    await expect(deleteSession("nonexistent-id")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("resolves without error when session exists", async () => {
    Session.findByIdAndDelete.mockResolvedValue({ _id: "s1" });
    await expect(deleteSession("s1")).resolves.toBeUndefined();
  });
});
