import { jest, describe, it, expect, beforeEach } from "@jest/globals";

jest.mock("../../src/models/Queue.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    getActiveQueue: jest.fn(),
    getNextWaiting: jest.fn(),
  },
}));
jest.mock("../../src/models/Booking.js", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), findByIdAndUpdate: jest.fn() },
}));
jest.mock("../../src/models/Studio.js", () => ({
  __esModule: true,
  default: { findByIdAndUpdate: jest.fn() },
}));
jest.mock("../../src/config/socket.js", () => ({
  __esModule: true,
  broadcastQueueUpdate: jest.fn().mockResolvedValue(undefined),
  initSocket: jest.fn(),
}));

import Queue from "../../src/models/Queue.js";
import Booking from "../../src/models/Booking.js";
import Studio from "../../src/models/Studio.js";
import { broadcastQueueUpdate } from "../../src/config/socket.js";

import { checkIn, confirmArrival, skipCustomer, callNext, checkOut, getQueueLog, getActiveQueue, getQueueStatusByBooking } from "../../src/services/queueService.js";

import { makeBooking, makeQueueEntry } from "../helpers/mockFactory.js";

describe("[Branch] checkIn — input validation and duplicate check branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when bookingNumber is missing", async () => {
    await expect(checkIn(null)).rejects.toMatchObject({ statusCode: 400 });
    await expect(checkIn("")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 404 when booking not found", async () => {
    Booking.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    await expect(checkIn("BK-NOTFOUND")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 400 when booking is already checked in (duplicate queue entry)", async () => {
    const booking = makeBooking();
    Booking.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(booking) });
    Queue.findOne.mockResolvedValue({ booking: booking._id });

    await expect(checkIn("BK-001")).rejects.toMatchObject({
      statusCode: 400,
      message: "This booking is already checked in",
    });
  });

  it("creates queue entry with status 'waiting' and sets booking to checked-in", async () => {
    const booking = makeBooking();
    Booking.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(booking) });
    Queue.findOne.mockResolvedValue(null);
    Queue.create.mockResolvedValue({ queueNumber: 5 });

    const result = await checkIn("BK-001");

    expect(Queue.create).toHaveBeenCalledWith({ booking: booking._id, status: "waiting" });
    expect(booking.status).toBe("checked-in");
    expect(booking.save).toHaveBeenCalledTimes(1);
    expect(broadcastQueueUpdate).toHaveBeenCalled();
    expect(result.queueNumber).toBe(5);
  });
});

describe("[Branch] confirmArrival — status and studio update branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when queueId is missing", async () => {
    await expect(confirmArrival(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 404 when queue entry not found", async () => {
    Queue.findById.mockResolvedValue(null);
    await expect(confirmArrival("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 400 when status is not 'called'", async () => {
    Queue.findById.mockResolvedValue(makeQueueEntry({ status: "waiting" }));
    await expect(confirmArrival("q1")).rejects.toMatchObject({
      statusCode: 400,
      message: "Customer must be called first before confirming arrival",
    });
  });

  it("sets status to 'in-progress' and startTime on success", async () => {
    const queueEntry = makeQueueEntry({ status: "called", studio: "studio-1", booking: "b1" });
    Queue.findById.mockResolvedValue(queueEntry);
    Studio.findByIdAndUpdate.mockResolvedValue({});
    Booking.findByIdAndUpdate.mockResolvedValue({});

    await confirmArrival("q1");

    expect(queueEntry.status).toBe("in-progress");
    expect(queueEntry.startTime).toBeInstanceOf(Date);
    expect(queueEntry.save).toHaveBeenCalled();
    expect(broadcastQueueUpdate).toHaveBeenCalled();
  });

  it("updates studio when queueEntry.studio is set", async () => {
    const queueEntry = makeQueueEntry({ status: "called", studio: "studio-1", booking: "b1" });
    Queue.findById.mockResolvedValue(queueEntry);
    Studio.findByIdAndUpdate.mockResolvedValue({});
    Booking.findByIdAndUpdate.mockResolvedValue({});

    await confirmArrival("q1");

    expect(Studio.findByIdAndUpdate).toHaveBeenCalledWith("studio-1", {
      isOccupied: true,
      currentBooking: "b1",
    });
  });

  it("does NOT update studio when queueEntry.studio is null", async () => {
    const queueEntry = makeQueueEntry({ status: "called", studio: null, booking: "b1" });
    Queue.findById.mockResolvedValue(queueEntry);
    Booking.findByIdAndUpdate.mockResolvedValue({});

    await confirmArrival("q1");

    expect(Studio.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe("[Path] callNext — complete execution paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when studioId is missing", async () => {
    await expect(callNext(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 404 when no customers are waiting", async () => {
    Queue.getNextWaiting.mockResolvedValue(null);
    await expect(callNext("studio-1")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("sets queue entry to 'called' and assigns studio", async () => {
    const queueEntry = makeQueueEntry({ status: "waiting", studio: null });
    Queue.getNextWaiting.mockResolvedValue(queueEntry);

    const result = await callNext("studio-1");

    expect(queueEntry.status).toBe("called");
    expect(queueEntry.studio).toBe("studio-1");
    expect(queueEntry.save).toHaveBeenCalled();
    expect(broadcastQueueUpdate).toHaveBeenCalled();
    expect(result).toBe(queueEntry);
  });
});

describe("[Path] checkOut — complete execution paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when queueId is missing", async () => {
    await expect(checkOut(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 404 when queue entry not found", async () => {
    Queue.findById.mockResolvedValue(null);
    await expect(checkOut("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("sets status to 'completed' and frees the studio", async () => {
    const queueEntry = makeQueueEntry({ status: "in-progress", studio: "studio-1", booking: "b1" });
    Queue.findById.mockResolvedValue(queueEntry);
    Studio.findByIdAndUpdate.mockResolvedValue({});
    Booking.findByIdAndUpdate.mockResolvedValue({});

    await checkOut("q1");

    expect(queueEntry.status).toBe("completed");
    expect(queueEntry.endTime).toBeInstanceOf(Date);
    expect(Studio.findByIdAndUpdate).toHaveBeenCalledWith("studio-1", { isOccupied: false, currentBooking: null });
    expect(broadcastQueueUpdate).toHaveBeenCalled();
  });
});

describe("[DataFlow] getQueueLog — pagination data computation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns paginated queue log", async () => {
    Queue.countDocuments.mockResolvedValue(10);
    Queue.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const result = await getQueueLog({ page: 1, limit: 10 });
    expect(result.pagination.total).toBe(10);
    expect(result.pagination.totalPages).toBe(1);
  });
});

describe("[Path] getActiveQueue — delegation to model static method", () => {
  beforeEach(() => jest.clearAllMocks());

  it("delegates to Queue.getActiveQueue and returns its result", async () => {
    const fakeQueue = [makeQueueEntry()];
    Queue.getActiveQueue.mockResolvedValue(fakeQueue);

    const result = await getActiveQueue();

    expect(Queue.getActiveQueue).toHaveBeenCalledTimes(1);
    expect(result).toBe(fakeQueue);
  });
});

describe("[Branch] getQueueStatusByBooking — status-based ahead count branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when bookingId is missing", async () => {
    await expect(getQueueStatusByBooking(null)).rejects.toMatchObject({ statusCode: 400 });
    await expect(getQueueStatusByBooking("")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 404 when no queue entry found for booking", async () => {
    const chain = { populate: jest.fn().mockReturnThis(), select: jest.fn().mockResolvedValue(null) };
    Queue.findOne.mockReturnValue(chain);

    await expect(getQueueStatusByBooking("booking-1")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns status with ahead=0 when status is not waiting or called", async () => {
    const queueEntry = makeQueueEntry({ status: "in-progress", queueNumber: 3 });
    const chain = { populate: jest.fn().mockReturnThis(), select: jest.fn().mockResolvedValue(queueEntry) };
    Queue.findOne.mockReturnValue(chain);

    const result = await getQueueStatusByBooking("booking-1");

    expect(Queue.countDocuments).not.toHaveBeenCalled();
    expect(result.ahead).toBe(0);
  });

  it("returns status with ahead count when status is 'waiting'", async () => {
    const queueEntry = makeQueueEntry({ status: "waiting", queueNumber: 5 });
    const chain = { populate: jest.fn().mockReturnThis(), select: jest.fn().mockResolvedValue(queueEntry) };
    Queue.findOne.mockReturnValue(chain);
    Queue.countDocuments.mockResolvedValue(3);

    const result = await getQueueStatusByBooking("booking-1");

    expect(Queue.countDocuments).toHaveBeenCalledWith({
      status: { $in: ["waiting", "called"] },
      queueNumber: { $lt: 5 },
    });
    expect(result.ahead).toBe(3);
  });

  it("returns status with ahead count when status is 'called'", async () => {
    const queueEntry = makeQueueEntry({ status: "called", queueNumber: 2 });
    const chain = { populate: jest.fn().mockReturnThis(), select: jest.fn().mockResolvedValue(queueEntry) };
    Queue.findOne.mockReturnValue(chain);
    Queue.countDocuments.mockResolvedValue(1);

    const result = await getQueueStatusByBooking("booking-1");

    expect(result.ahead).toBe(1);
  });
});

describe("[DataFlow] skipCustomer — skippedCount increment and studio field reset", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when bookingId is missing", async () => {
    await expect(skipCustomer(null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 404 when queue entry not found", async () => {
    Queue.findOne.mockResolvedValue(null);
    await expect(skipCustomer("b1")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 400 when status is not 'called'", async () => {
    Queue.findOne.mockResolvedValue(makeQueueEntry({ status: "waiting" }));
    await expect(skipCustomer("b1")).rejects.toMatchObject({
      statusCode: 400,
      message: "Only a customer in 'called' status can be skipped",
    });
  });

  it("increments skippedCount and resets studio to null", async () => {
    const queueEntry = makeQueueEntry({ status: "called", studio: "studio-1", skippedCount: 0 });
    Queue.findOne.mockResolvedValue(queueEntry);

    await skipCustomer("b1");

    expect(queueEntry.status).toBe("waiting");
    expect(queueEntry.studio).toBeNull();
    expect(queueEntry.skippedCount).toBe(1);
    expect(queueEntry.save).toHaveBeenCalled();
    expect(broadcastQueueUpdate).toHaveBeenCalled();
  });
});
