import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import crypto from "crypto";

jest.mock("../../src/models/Booking.js", () => ({
  __esModule: true,
  default: { create: jest.fn(), findById: jest.fn(), findOne: jest.fn(), find: jest.fn(), countDocuments: jest.fn(), findByIdAndUpdate: jest.fn() },
}));
jest.mock("../../src/models/Session.js", () => ({
  __esModule: true,
  default: { findById: jest.fn(), find: jest.fn() },
}));
jest.mock("../../src/models/Package.js", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("../../src/models/Addon.js", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("../../src/models/Payment.js", () => ({
  __esModule: true,
  default: { create: jest.fn(), findOne: jest.fn(), findById: jest.fn() },
}));
jest.mock("../../src/models/Shipment.js", () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));
jest.mock("../../src/models/Queue.js", () => ({
  __esModule: true,
  default: { findById: jest.fn(), findOne: jest.fn() },
}));
jest.mock("../../src/models/Graduate.js", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("../../src/models/FrameOrder.js", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("axios", () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));
jest.mock("../../src/utils/sendBookingEmail.js", () => ({
  __esModule: true,
  sendBookingConfirmation: jest.fn(),
}));
jest.mock("../../src/config/socket.js", () => ({
  __esModule: true,
  broadcastQueueUpdate: jest.fn().mockResolvedValue(undefined),
  initSocket: jest.fn(),
}));
jest.mock("../../src/services/frameOrderService.js", () => ({
  __esModule: true,
  applyFrameOrderPaymentResult: jest.fn().mockResolvedValue(undefined),
}));

import Booking from "../../src/models/Booking.js";
import Session from "../../src/models/Session.js";
import Package from "../../src/models/Package.js";
import Addon from "../../src/models/Addon.js";
import Payment from "../../src/models/Payment.js";
import Shipment from "../../src/models/Shipment.js";
import Queue from "../../src/models/Queue.js";
import FrameOrder from "../../src/models/FrameOrder.js";
import Graduate from "../../src/models/Graduate.js";
import axios from "axios";
import { sendBookingConfirmation } from "../../src/utils/sendBookingEmail.js";
import { broadcastQueueUpdate } from "../../src/config/socket.js";
import { applyFrameOrderPaymentResult } from "../../src/services/frameOrderService.js";

import {
  createBooking,
  cancelBooking,
  handleBillplzCallback,
  adminCreateBooking,
  reconcilePaymentById,
  getBookingById,
  updateBooking,
  getMyBookings,
  getAllBookings,
  getMyBookingById,
  getBookingByNumber,
} from "../../src/services/bookingService.js";

import { makeBooking, makeSession, makePayment } from "../helpers/mockFactory.js";

const FAKE_USER = {
  _id: "64f0000000000000000000a1",
  email: "user@test.com",
  fullName: "Test User",
  phone: "+60123456789",
};

function makeBillplzSignature(body) {
  const data = { ...body };
  delete data.x_signature;
  const sourceString = Object.keys(data)
    .map((k) => `${k}${data[k] ?? ""}`)
    .sort()
    .join("|");
  return crypto.createHmac("sha256", process.env.BILLPLZ_X_SIGNATURE).update(sourceString).digest("hex");
}

describe("[Branch] createBooking — pre-condition validation and conditional branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when session not found", async () => {
    Session.findById.mockResolvedValue(null);
    Package.findById.mockResolvedValue({ price: 150 });
    await expect(createBooking({ session: "s1", package: "p1", graduate: "g1" }, FAKE_USER))
      .rejects.toMatchObject({ statusCode: 404, message: "Session not found" });
  });

  it("throws 400 when session is fully booked", async () => {
    Session.findById.mockResolvedValue(makeSession({ bookedCount: 5, capacity: 5 }));
    Package.findById.mockResolvedValue({ price: 150 });
    await expect(createBooking({ session: "s1", package: "p1", graduate: "g1" }, FAKE_USER))
      .rejects.toMatchObject({ statusCode: 400, message: "Session is fully booked" });
  });

  it("throws 404 when package not found", async () => {
    Session.findById.mockResolvedValue(makeSession());
    Package.findById.mockResolvedValue(null);
    await expect(createBooking({ session: "s1", package: "p1", graduate: "g1" }, FAKE_USER))
      .rejects.toMatchObject({ statusCode: 404, message: "Package not found" });
  });

  it("calculates totalAmount as package price when no addons", async () => {
    Session.findById.mockResolvedValue(makeSession());
    Package.findById.mockResolvedValue({ price: 150 });
    Booking.create.mockResolvedValue(makeBooking());
    Payment.create.mockResolvedValue(makePayment());
    axios.post.mockResolvedValue({ data: { url: "https://pay.url", id: "bill-123" } });

    await createBooking({ session: "s1", package: "p1", graduate: "g1", addons: [] }, FAKE_USER);

    const billplzBody = axios.post.mock.calls[0][1];
    expect(billplzBody.amount).toBe(150 * 100);
  });

  it("sums addon prices into totalAmount", async () => {
    Session.findById.mockResolvedValue(makeSession());
    Package.findById.mockResolvedValue({ price: 150 });
    Addon.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ price: 20 }, { price: 30 }]) });
    Booking.create.mockResolvedValue(makeBooking());
    Payment.create.mockResolvedValue(makePayment());
    axios.post.mockResolvedValue({ data: { url: "https://pay.url", id: "bill-123" } });

    await createBooking({ session: "s1", package: "p1", graduate: "g1", addons: ["a1", "a2"] }, FAKE_USER);

    const billplzBody = axios.post.mock.calls[0][1];
    expect(billplzBody.amount).toBe(200 * 100);
  });

  it("creates shipment when shipmentData is provided", async () => {
    Session.findById.mockResolvedValue(makeSession());
    Package.findById.mockResolvedValue({ price: 100 });
    const booking = makeBooking();
    Booking.create.mockResolvedValue(booking);
    Payment.create.mockResolvedValue(makePayment());
    Shipment.create.mockResolvedValue({ _id: "ship-1" });
    axios.post.mockResolvedValue({ data: { url: "https://pay.url", id: "bill-123" } });

    await createBooking(
      { session: "s1", package: "p1", graduate: "g1", shipment: { receiver: { name: "John", email: "john@example.com", address_1: "123 Main St", address_2: "Apt 4B", city: "New York", state: "NY", postcode: "10001" } } },
      FAKE_USER
    );

    expect(Shipment.create).toHaveBeenCalledTimes(1);
    expect(booking.save).toHaveBeenCalled();
  });

  it("handles null receiver in shipmentData (normalizeReceiver null branch)", async () => {
    Session.findById.mockResolvedValue(makeSession());
    Package.findById.mockResolvedValue({ price: 100 });
    const booking = makeBooking();
    Booking.create.mockResolvedValue(booking);
    Payment.create.mockResolvedValue(makePayment());
    Shipment.create.mockResolvedValue({ _id: "ship-1" });
    axios.post.mockResolvedValue({ data: { url: "https://pay.url", id: "bill-123" } });

    await createBooking(
      { session: "s1", package: "p1", graduate: "g1", shipment: { receiver: null } },
      FAKE_USER
    );

    const receiverArg = Shipment.create.mock.calls[0][0].receiver;
    expect(receiverArg).toBeNull();
  });

  it("normalizes receiver with only some fields set (covers normalizeReceiver falsy branches)", async () => {
    Session.findById.mockResolvedValue(makeSession());
    Package.findById.mockResolvedValue({ price: 100 });
    const booking = makeBooking();
    Booking.create.mockResolvedValue(booking);
    Payment.create.mockResolvedValue(makePayment());
    Shipment.create.mockResolvedValue({ _id: "ship-1" });
    axios.post.mockResolvedValue({ data: { url: "https://pay.url", id: "bill-123" } });

    // receiver with only name — email, address_1, address_2, city all absent
    await createBooking(
      { session: "s1", package: "p1", graduate: "g1", shipment: { receiver: { name: "john doe" } } },
      FAKE_USER
    );

    const receiverArg = Shipment.create.mock.calls[0][0].receiver;
    expect(receiverArg.name).toBe("John Doe");
    expect(receiverArg.email).toBeUndefined();
  });

  it("does NOT create shipment when shipmentData is absent", async () => {
    Session.findById.mockResolvedValue(makeSession());
    Package.findById.mockResolvedValue({ price: 100 });
    Booking.create.mockResolvedValue(makeBooking());
    Payment.create.mockResolvedValue(makePayment());
    axios.post.mockResolvedValue({ data: { url: "https://pay.url", id: "bill-123" } });

    await createBooking({ session: "s1", package: "p1", graduate: "g1" }, FAKE_USER);

    expect(Shipment.create).not.toHaveBeenCalled();
  });

  it("returns paymentUrl and bookingId from Billplz response", async () => {
    Session.findById.mockResolvedValue(makeSession());
    Package.findById.mockResolvedValue({ price: 100 });
    const booking = makeBooking({ _id: "booking-id-1" });
    Booking.create.mockResolvedValue(booking);
    Payment.create.mockResolvedValue(makePayment());
    axios.post.mockResolvedValue({ data: { url: "https://payment.url/bill", id: "bill-999" } });

    const result = await createBooking({ session: "s1", package: "p1", graduate: "g1" }, FAKE_USER);

    expect(result.paymentUrl).toBe("https://payment.url/bill");
    expect(result.bookingId).toBe("booking-id-1");
  });
});

describe("[Branch] cancelBooking — status validation and session/queue update branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when booking not found", async () => {
    Booking.findById.mockResolvedValue(null);
    await expect(cancelBooking("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 400 when booking is already cancelled", async () => {
    Booking.findById.mockResolvedValue(makeBooking({ status: "cancelled" }));
    await expect(cancelBooking("id1")).rejects.toMatchObject({
      statusCode: 400,
      message: "Booking is already cancelled",
    });
  });

  it.each(["checked-in", "in-progress", "completed", "preparing", "delivery"])(
    "throws 400 for non-cancellable status '%s'",
    async (status) => {
      Booking.findById.mockResolvedValue(makeBooking({ status }));
      await expect(cancelBooking("id1")).rejects.toMatchObject({ statusCode: 400 });
    }
  );

  it("cancels a pending booking without decrementing session count", async () => {
    const booking = makeBooking({ status: "pending", paymentStatus: "pending" });
    Booking.findById.mockResolvedValue(booking);

    await cancelBooking("id1");

    expect(booking.status).toBe("cancelled");
    expect(booking.save).toHaveBeenCalledTimes(1);
    expect(Session.findById).not.toHaveBeenCalled();
  });

  it("decrements session.bookedCount for a paid booking", async () => {
    const booking = makeBooking({ status: "booked", paymentStatus: "paid", session: "session-1" });
    Booking.findById.mockResolvedValue(booking);
    const session = makeSession({ bookedCount: 3, capacity: 5 });
    Session.findById.mockResolvedValue(session);

    await cancelBooking("id1");

    expect(session.bookedCount).toBe(2);
    expect(session.save).toHaveBeenCalled();
  });

  it("does not throw when session is null for a paid booking (null-session branch)", async () => {
    const booking = makeBooking({ status: "booked", paymentStatus: "paid", session: "session-1" });
    Booking.findById.mockResolvedValue(booking);
    Session.findById.mockResolvedValue(null);

    await expect(cancelBooking("id1")).resolves.toBeUndefined();
    expect(booking.status).toBe("cancelled");
  });

  it("does not decrement bookedCount when session.bookedCount is already 0", async () => {
    const booking = makeBooking({ status: "booked", paymentStatus: "paid", session: "session-1" });
    Booking.findById.mockResolvedValue(booking);
    const session = makeSession({ bookedCount: 0, capacity: 5 });
    Session.findById.mockResolvedValue(session);

    await cancelBooking("id1");

    expect(session.bookedCount).toBe(0);
    expect(session.save).not.toHaveBeenCalled();
  });

  it("marks session status 'full' when bookedCount still >= capacity after decrement", async () => {
    const booking = makeBooking({ status: "booked", paymentStatus: "paid", session: "session-1" });
    Booking.findById.mockResolvedValue(booking);
    const session = makeSession({ bookedCount: 3, capacity: 2 });
    Session.findById.mockResolvedValue(session);

    await cancelBooking("id1");

    expect(session.bookedCount).toBe(2);
    expect(session.status).toBe("full");
  });

  it("cancels related queue entry when booking has a queue", async () => {
    const booking = makeBooking({
      status: "booked",
      paymentStatus: "pending",
      queue: "queue-id-1",
    });
    Booking.findById.mockResolvedValue(booking);
    const queueEntry = { status: "waiting", save: jest.fn().mockResolvedValue(true) };
    Queue.findById.mockResolvedValue(queueEntry);

    await cancelBooking("id1");

    expect(queueEntry.status).toBe("cancelled");
    expect(queueEntry.save).toHaveBeenCalled();
    expect(broadcastQueueUpdate).toHaveBeenCalled();
  });

  it("does NOT cancel queue when it is already completed/cancelled", async () => {
    const booking = makeBooking({ status: "booked", paymentStatus: "pending", queue: "queue-id-1" });
    Booking.findById.mockResolvedValue(booking);
    Queue.findById.mockResolvedValue({ status: "completed", save: jest.fn() });

    await cancelBooking("id1");

    expect(broadcastQueueUpdate).not.toHaveBeenCalled();
  });
});

describe("[Branch] handleBillplzCallback — signature verification and payment routing branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 400 when HMAC signature is invalid", async () => {
    const body = { id: "bill-123", paid: "true", paid_amount: "15000", x_signature: "wrong-sig" };
    await expect(handleBillplzCallback(body)).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid signature",
    });
  });

  it("throws 400 when bill id is missing (after valid signature)", async () => {
    const body = { paid: "true", paid_amount: "15000" };
    const sig = makeBillplzSignature(body);
    await expect(handleBillplzCallback({ ...body, x_signature: sig })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("throws 404 when payment not found by gatewayTransactionId", async () => {
    const body = { id: "bill-999", paid: "true", paid_amount: "15000" };
    const sig = makeBillplzSignature(body);
    Payment.findOne.mockResolvedValue(null);

    await expect(handleBillplzCallback({ ...body, x_signature: sig })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("sets booking status to 'booked' and paymentStatus to 'paid' when paid=true", async () => {
    const body = { id: "bill-123", paid: "true", paid_amount: "15000" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ gatewayTransactionId: "bill-123", paymentStatus: "pending" });
    Payment.findOne.mockResolvedValue(payment);

    const booking = makeBooking({ status: "pending", paymentStatus: "pending" });
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    const session = makeSession({ bookedCount: 0, capacity: 5 });
    Session.findById.mockResolvedValue(session);
    sendBookingConfirmation.mockResolvedValue(undefined);

    await handleBillplzCallback({ ...body, x_signature: sig });

    expect(booking.status).toBe("booked");
    expect(booking.paymentStatus).toBe("paid");
    expect(booking.save).toHaveBeenCalled();
  });

  it("sets booking status to 'cancelled' and paymentStatus to 'failed' when paid=false", async () => {
    const body = { id: "bill-123", paid: "false", paid_amount: "0" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ gatewayTransactionId: "bill-123", paymentStatus: "pending" });
    Payment.findOne.mockResolvedValue(payment);

    const booking = makeBooking();
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    await handleBillplzCallback({ ...body, x_signature: sig });

    expect(booking.status).toBe("cancelled");
    expect(booking.paymentStatus).toBe("failed");
  });

  it("does NOT increment session.bookedCount when payment was already paid", async () => {
    const body = { id: "bill-123", paid: "true", paid_amount: "15000" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ paymentStatus: "paid", gatewayTransactionId: "bill-123" });
    Payment.findOne.mockResolvedValue(payment);

    const booking = makeBooking({ paymentStatus: "paid" });
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);
    sendBookingConfirmation.mockResolvedValue(undefined);

    await handleBillplzCallback({ ...body, x_signature: sig });

    expect(Session.findById).not.toHaveBeenCalled();
  });

  it("handles null paid_amount value (covers ?? '' branch in signature and ternary=0)", async () => {
    const body = { id: "bill-123", paid: "false", paid_amount: null };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ gatewayTransactionId: "bill-123", paymentStatus: "pending" });
    Payment.findOne.mockResolvedValue(payment);

    const booking = makeBooking();
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    await handleBillplzCallback({ ...body, x_signature: sig });

    expect(payment.paidAmount).toBe(0);
    expect(booking.status).toBe("cancelled");
  });

  it("defaults paidAmount to 0 when paid_amount is absent (covers ?? and ternary branches)", async () => {
    const body = { id: "bill-123", paid: "false" }; // no paid_amount
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ gatewayTransactionId: "bill-123", paymentStatus: "pending" });
    Payment.findOne.mockResolvedValue(payment);

    const booking = makeBooking();
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    await handleBillplzCallback({ ...body, x_signature: sig });

    expect(booking.status).toBe("cancelled");
    expect(payment.paidAmount).toBe(0);
  });

  it("throws 404 when frameOrder payment's order is not found", async () => {
    const body = { id: "bill-fo-miss", paid: "true", paid_amount: "10000" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ frameOrder: "fo-missing", booking: null, gatewayTransactionId: "bill-fo-miss" });
    Payment.findOne.mockResolvedValue(payment);
    FrameOrder.findById.mockResolvedValue(null);

    await expect(handleBillplzCallback({ ...body, x_signature: sig })).rejects.toMatchObject({
      statusCode: 404,
      message: "Frame order not found",
    });
  });

  it("throws 404 when booking is not found for a non-frameOrder payment", async () => {
    const body = { id: "bill-no-booking", paid: "true", paid_amount: "10000" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ frameOrder: null, booking: "booking-gone", gatewayTransactionId: "bill-no-booking" });
    Payment.findOne.mockResolvedValue(payment);

    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(null).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    await expect(handleBillplzCallback({ ...body, x_signature: sig })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("sets session status to 'full' when bookedCount reaches capacity after payment", async () => {
    const body = { id: "bill-full", paid: "true", paid_amount: "15000" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ gatewayTransactionId: "bill-full", paymentStatus: "pending" });
    Payment.findOne.mockResolvedValue(payment);

    const booking = makeBooking({ status: "pending", paymentStatus: "pending" });
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    const session = makeSession({ bookedCount: 4, capacity: 5 });
    Session.findById.mockResolvedValue(session);
    sendBookingConfirmation.mockResolvedValue(undefined);

    await handleBillplzCallback({ ...body, x_signature: sig });

    expect(session.bookedCount).toBe(5);
    expect(session.status).toBe("full");
  });

  it("does not increment session count when session is null after paid callback", async () => {
    const body = { id: "bill-nosess", paid: "true", paid_amount: "15000" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ gatewayTransactionId: "bill-nosess", paymentStatus: "pending" });
    Payment.findOne.mockResolvedValue(payment);

    const booking = makeBooking({ status: "pending", paymentStatus: "pending" });
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    Session.findById.mockResolvedValue(null);
    sendBookingConfirmation.mockResolvedValue(undefined);

    await handleBillplzCallback({ ...body, x_signature: sig });

    expect(booking.status).toBe("booked");
    // session.save should not have been called since session is null
  });

  it("routes to applyFrameOrderPaymentResult when payment has a frameOrder", async () => {
    const body = { id: "bill-fo-1", paid: "true", paid_amount: "20000" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ frameOrder: "fo-id-1", booking: null, gatewayTransactionId: "bill-fo-1" });
    Payment.findOne.mockResolvedValue(payment);
    FrameOrder.findById.mockResolvedValue({ _id: "fo-id-1", orderNumber: "FO-001" });

    await handleBillplzCallback({ ...body, x_signature: sig });

    expect(applyFrameOrderPaymentResult).toHaveBeenCalled();
    expect(Booking.findById).not.toHaveBeenCalled();
  });
});

describe("[Branch] adminCreateBooking — payment method and capacity validation branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when package not found", async () => {
    Package.findById.mockResolvedValue(null);
    Session.findById.mockResolvedValue(makeSession());
    await expect(
      adminCreateBooking({ graduate: "g1", package: "p1", session: "s1", paymentMethod: "cash" })
    ).rejects.toMatchObject({ statusCode: 404, message: "Package not found" });
  });

  it("throws 404 when session not found", async () => {
    Package.findById.mockResolvedValue({ price: 100 });
    Session.findById.mockResolvedValue(null);
    await expect(
      adminCreateBooking({ graduate: "g1", package: "p1", session: "s1", paymentMethod: "cash" })
    ).rejects.toMatchObject({ statusCode: 404, message: "Session not found" });
  });

  it("throws 400 when session is fully booked", async () => {
    Package.findById.mockResolvedValue({ price: 100 });
    Session.findById.mockResolvedValue(makeSession({ bookedCount: 5, capacity: 5 }));
    await expect(
      adminCreateBooking({ graduate: "g1", package: "p1", session: "s1", paymentMethod: "cash" })
    ).rejects.toMatchObject({ statusCode: 400, message: "Session is fully booked" });
  });

  it("throws 400 for invalid paymentMethod", async () => {
    await expect(
      adminCreateBooking({ graduate: "g1", package: "p1", session: "s1", paymentMethod: "credit-card" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("creates booking with status 'booked' and paymentStatus 'paid' immediately", async () => {
    Package.findById.mockResolvedValue({ price: 150 });
    Session.findById.mockResolvedValue(makeSession({ bookedCount: 0, capacity: 5 }));
    const booking = makeBooking({ status: "booked", paymentStatus: "paid" });
    booking.populate = jest.fn().mockResolvedValue(undefined);
    Booking.create.mockResolvedValue(booking);
    Payment.create.mockResolvedValue({});
    sendBookingConfirmation.mockResolvedValue(undefined);

    await adminCreateBooking({
      graduate: "g1",
      package: "p1",
      session: "s1",
      paymentMethod: "cash",
    });

    const createArg = Booking.create.mock.calls[0][0];
    expect(createArg.status).toBe("booked");
    expect(createArg.paymentStatus).toBe("paid");
  });

  it("increments session.bookedCount and sets status to 'full' when at capacity", async () => {
    Package.findById.mockResolvedValue({ price: 100 });
    const session = makeSession({ bookedCount: 2, capacity: 3 });
    Session.findById.mockResolvedValue(session);
    const booking = makeBooking();
    booking.populate = jest.fn().mockResolvedValue(undefined);
    Booking.create.mockResolvedValue(booking);
    Payment.create.mockResolvedValue({});
    sendBookingConfirmation.mockResolvedValue(undefined);

    await adminCreateBooking({ graduate: "g1", package: "p1", session: "s1", paymentMethod: "cash" });

    expect(session.bookedCount).toBe(3);
    expect(session.status).toBe("full");
  });
});

describe("[Path] reconcilePaymentById — complete execution paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns false immediately when payment is not pending", async () => {
    const payment = makePayment({ paymentStatus: "paid" });
    const result = await reconcilePaymentById(payment);
    expect(result).toBe(false);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("returns false immediately when gatewayTransactionId is missing", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: null });
    const result = await reconcilePaymentById(payment);
    expect(result).toBe(false);
  });

  it("marks payment failed when Billplz returns 404", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: "bill-abc" });
    const err = new Error("Not Found");
    err.response = { status: 404 };
    axios.get.mockRejectedValue(err);

    const booking = makeBooking();
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    const result = await reconcilePaymentById(payment);

    expect(result).toBe(true);
    expect(booking.status).toBe("cancelled");
  });

  it("marks payment paid when Billplz confirms paid=true", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: "bill-abc" });
    axios.get.mockResolvedValue({ data: { paid: true, paid_amount: "15000" } });

    const booking = makeBooking();
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    const session = makeSession({ bookedCount: 0, capacity: 5 });
    Session.findById.mockResolvedValue(session);
    sendBookingConfirmation.mockResolvedValue(undefined);

    const result = await reconcilePaymentById(payment);

    expect(result).toBe(true);
    expect(booking.status).toBe("booked");
    expect(booking.paymentStatus).toBe("paid");
  });
});

describe("[Path] getBookingById — not found vs found paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when booking not found", async () => {
    const chain = { populate: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) };
    Booking.findById.mockReturnValue(chain);
    await expect(getBookingById("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns booking when found", async () => {
    const booking = makeBooking();
    const chain = { populate: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(booking) };
    Booking.findById.mockReturnValue(chain);
    const result = await getBookingById("b1");
    expect(result).toEqual(booking);
  });
});

describe("[Branch] updateBooking — field whitelist and not found branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when booking not found", async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    };
    Booking.findByIdAndUpdate.mockReturnValue(chain);
    await expect(updateBooking("nonexistent", { status: "booked" })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("only updates whitelisted BOOKING_UPDATE_FIELDS", async () => {
    const booking = makeBooking();
    const chain = {
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(booking),
    };
    Booking.findByIdAndUpdate.mockReturnValue(chain);

    await updateBooking("b1", { status: "booked", paymentStatus: "paid", totalPrice: 999 });

    const updatePayload = Booking.findByIdAndUpdate.mock.calls[0][1];
    expect(updatePayload.status).toBe("booked");
    expect(updatePayload.paymentStatus).toBeUndefined();
    expect(updatePayload.totalPrice).toBeUndefined();
  });
});

describe("[Branch] getMyBookings — status filter branch", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns all bookings for a user", async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([makeBooking()]),
    };
    Booking.find.mockReturnValue(chain);

    const result = await getMyBookings("user-id-1");
    expect(Booking.find).toHaveBeenCalledWith({ graduate: "user-id-1" });
    expect(result).toHaveLength(1);
  });

  it("applies status filter when provided", async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    Booking.find.mockReturnValue(chain);

    await getMyBookings("user-id-1", { status: "booked" });
    expect(Booking.find).toHaveBeenCalledWith({ graduate: "user-id-1", status: "booked" });
  });
});

describe("[Branch] getAllBookings — date filter and pagination branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns paginated bookings with no filters", async () => {
    Booking.countDocuments.mockResolvedValue(5);
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    Booking.find.mockReturnValue(chain);

    const result = await getAllBookings({});
    expect(result.pagination.total).toBe(5);
  });

  it("returns empty result when no sessions match the date filter", async () => {
    const sessionChain = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    Session.find.mockReturnValue(sessionChain);

    const result = await getAllBookings({ date: "2025-10-01" });
    expect(result.data).toHaveLength(0);
    expect(result.count).toBe(0);
  });

  it("applies session filter when date matches sessions", async () => {
    const sessionChain = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: "session-1" }]),
    };
    Session.find.mockReturnValue(sessionChain);

    Booking.countDocuments.mockResolvedValue(2);
    const bookingChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([makeBooking(), makeBooking()]),
    };
    Booking.find.mockReturnValue(bookingChain);

    const result = await getAllBookings({ date: "2025-10-01" });
    expect(result.count).toBe(2);
    const filterArg = Booking.find.mock.calls[0][0];
    expect(filterArg.session).toBeDefined();
  });

  it("applies status filter when status is provided", async () => {
    Booking.countDocuments.mockResolvedValue(2);
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([makeBooking(), makeBooking()]),
    };
    Booking.find.mockReturnValue(chain);

    await getAllBookings({ status: "booked" });

    const filterArg = Booking.find.mock.calls[0][0];
    expect(filterArg.status).toBe("booked");
  });

  it("applies graduate filter when graduate is provided", async () => {
    Booking.countDocuments.mockResolvedValue(1);
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([makeBooking()]),
    };
    Booking.find.mockReturnValue(chain);

    await getAllBookings({ graduate: "grad-id-1" });

    const filterArg = Booking.find.mock.calls[0][0];
    expect(filterArg.graduate).toBe("grad-id-1");
  });

  it("searches by graduate name/email and booking number", async () => {
    const graduateChain = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: "grad-1" }]),
    };
    Graduate.find.mockReturnValue(graduateChain);

    Booking.countDocuments.mockResolvedValue(1);
    const bookingChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([makeBooking()]),
    };
    Booking.find.mockReturnValue(bookingChain);

    const result = await getAllBookings({ search: "john" });
    expect(Graduate.find).toHaveBeenCalled();
    const filterArg = Booking.find.mock.calls[0][0];
    expect(filterArg.$or).toBeDefined();
    expect(result.count).toBe(1);
  });
});

describe("getMyBookingById", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when booking not found or inaccessible", async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    };
    Booking.findOne.mockReturnValue(chain);
    await expect(getMyBookingById("user-1", "booking-1")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns booking when found for the user", async () => {
    const booking = makeBooking();
    const chain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(booking),
    };
    Booking.findOne.mockReturnValue(chain);

    const result = await getMyBookingById("user-1", "booking-1");
    expect(result).toEqual(booking);
    expect(Booking.findOne).toHaveBeenCalledWith({ _id: "booking-1", graduate: "user-1" });
  });
});

describe("getBookingByNumber", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when booking number not found", async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    };
    Booking.findOne.mockReturnValue(chain);
    await expect(getBookingByNumber("BK-NONEXIST")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns booking when found by number", async () => {
    const booking = makeBooking({ bookingNumber: "BK-001" });
    const chain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(booking),
    };
    Booking.findOne.mockReturnValue(chain);

    const result = await getBookingByNumber("BK-001");
    expect(result.bookingNumber).toBe("BK-001");
  });
});

describe("adminCreateBooking – additional branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sums addon prices into totalAmount", async () => {
    Package.findById.mockResolvedValue({ price: 100 });
    Session.findById.mockResolvedValue(makeSession({ bookedCount: 0, capacity: 5 }));
    Addon.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ price: 20 }, { price: 30 }]) });
    const booking = makeBooking();
    booking.populate = jest.fn().mockResolvedValue(undefined);
    Booking.create.mockResolvedValue(booking);
    Payment.create.mockResolvedValue({});
    sendBookingConfirmation.mockResolvedValue(undefined);

    await adminCreateBooking({ graduate: "g1", package: "p1", session: "s1", paymentMethod: "cash", addons: ["a1", "a2"] });

    const createArg = Booking.create.mock.calls[0][0];
    expect(createArg.totalPrice).toBe(150);
  });

  it("creates shipment when shipmentData is provided", async () => {
    Package.findById.mockResolvedValue({ price: 100 });
    Session.findById.mockResolvedValue(makeSession({ bookedCount: 0, capacity: 5 }));
    const booking = makeBooking();
    booking.populate = jest.fn().mockResolvedValue(undefined);
    Booking.create.mockResolvedValue(booking);
    Payment.create.mockResolvedValue({});
    Shipment.create.mockResolvedValue({ _id: "ship-1" });
    sendBookingConfirmation.mockResolvedValue(undefined);

    await adminCreateBooking({
      graduate: "g1",
      package: "p1",
      session: "s1",
      paymentMethod: "cash",
      shipment: { receiver: { name: "John", email: "john@example.com", address_1: "123 Main St", city: "KL", postcode: "50000" } },
    });

    expect(Shipment.create).toHaveBeenCalledTimes(1);
    expect(booking.save).toHaveBeenCalled();
  });

  it("does not throw when sendBookingConfirmation rejects", async () => {
    Package.findById.mockResolvedValue({ price: 100 });
    Session.findById.mockResolvedValue(makeSession({ bookedCount: 0, capacity: 5 }));
    const booking = makeBooking();
    booking.populate = jest.fn().mockResolvedValue(undefined);
    Booking.create.mockResolvedValue(booking);
    Payment.create.mockResolvedValue({});
    sendBookingConfirmation.mockRejectedValue(new Error("email fail"));

    await expect(
      adminCreateBooking({ graduate: "g1", package: "p1", session: "s1", paymentMethod: "cash" })
    ).resolves.not.toThrow();
  });
});

describe("handleBillplzCallback – email failure in applyPaymentResult", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not throw when sendBookingConfirmation rejects after paid callback", async () => {
    const body = { id: "bill-123", paid: "true", paid_amount: "15000" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ gatewayTransactionId: "bill-123", paymentStatus: "pending" });
    Payment.findOne.mockResolvedValue(payment);

    const booking = makeBooking({ status: "pending", paymentStatus: "pending" });
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    Session.findById.mockResolvedValue(makeSession({ bookedCount: 0, capacity: 5 }));
    sendBookingConfirmation.mockRejectedValue(new Error("smtp fail"));

    await expect(handleBillplzCallback({ ...body, x_signature: sig })).resolves.not.toThrow();
    expect(booking.status).toBe("booked");
  });
});

describe("reconcilePaymentById – additional branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("handles frameOrder payment when Billplz returns 404", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: "bill-fo-x", frameOrder: "fo-id-1", booking: null });
    const err = new Error("Not Found");
    err.response = { status: 404 };
    axios.get.mockRejectedValue(err);

    FrameOrder.findById.mockResolvedValue({ _id: "fo-id-1", orderNumber: "FO-001" });

    const result = await reconcilePaymentById(payment);

    expect(result).toBe(true);
    expect(applyFrameOrderPaymentResult).toHaveBeenCalledWith(payment, expect.anything(), false, 0);
  });

  it("fetches payment from DB when paymentDoc has no save (ternary false branch)", async () => {
    const paymentDoc = { paymentStatus: "pending", gatewayTransactionId: "bill-abc", frameOrder: null, _id: "e1", booking: "b1" };
    const err = new Error("Not Found");
    err.response = { status: 404 };
    axios.get.mockRejectedValue(err);

    const fetchedPayment = makePayment({ gatewayTransactionId: "bill-abc" });
    Payment.findById.mockResolvedValue(fetchedPayment);

    const booking = makeBooking();
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    const result = await reconcilePaymentById(paymentDoc);

    expect(Payment.findById).toHaveBeenCalledWith("e1");
    expect(result).toBe(true);
  });

  it("returns false when order is null in frameOrder 404 path (payment && order false branch)", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: "bill-fo-404", frameOrder: "fo-gone", booking: null });
    const err = new Error("Not Found");
    err.response = { status: 404 };
    axios.get.mockRejectedValue(err);

    FrameOrder.findById.mockResolvedValue(null);

    const result = await reconcilePaymentById(payment);

    expect(result).toBe(false);
  });

  it("returns false when booking is null in non-frameOrder 404 path (payment && booking false branch)", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: "bill-bk-404", frameOrder: null });
    const err = new Error("Not Found");
    err.response = { status: 404 };
    axios.get.mockRejectedValue(err);

    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(null).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    const result = await reconcilePaymentById(payment);

    expect(result).toBe(false);
  });

  it("fetches payment from DB in success path when paymentDoc has no save (line 459 ternary)", async () => {
    const paymentDoc = { paymentStatus: "pending", gatewayTransactionId: "bill-nosave", frameOrder: null, _id: "e2", booking: "b2" };
    axios.get.mockResolvedValue({ data: { paid: false, paid_amount: "0" } });

    const fetchedPayment = makePayment({ gatewayTransactionId: "bill-nosave" });
    Payment.findById.mockResolvedValue(fetchedPayment);

    const booking = makeBooking();
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    const result = await reconcilePaymentById(paymentDoc);

    expect(Payment.findById).toHaveBeenCalledWith("e2");
    expect(result).toBe(true);
    expect(booking.status).toBe("cancelled");
  });

  it("uses paidAmount=0 when Billplz paid_amount is absent (ternary false branch)", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: "bill-abc", frameOrder: null });
    axios.get.mockResolvedValue({ data: { paid: true, paid_amount: null } });

    const booking = makeBooking();
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    Session.findById.mockResolvedValue(makeSession({ bookedCount: 0, capacity: 5 }));
    sendBookingConfirmation.mockResolvedValue(undefined);

    const result = await reconcilePaymentById(payment);

    expect(result).toBe(true);
    expect(payment.paidAmount).toBe(0);
  });

  it("returns false when order is null in frameOrder success path", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: "bill-fo-ok", frameOrder: "fo-gone", booking: null });
    axios.get.mockResolvedValue({ data: { paid: true, paid_amount: "20000" } });

    FrameOrder.findById.mockResolvedValue(null);

    const result = await reconcilePaymentById(payment);

    expect(result).toBe(false);
  });

  it("returns false when booking is null in non-frameOrder success path", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: "bill-bk-ok", frameOrder: null });
    axios.get.mockResolvedValue({ data: { paid: false, paid_amount: "0" } });

    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(null).then(resolve) };
    Booking.findById.mockReturnValue(chain);

    const result = await reconcilePaymentById(payment);

    expect(result).toBe(false);
  });

  it("returns false and logs error for non-404 Billplz API errors", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: "bill-abc" });
    const err = new Error("Server Error");
    err.response = { status: 500 };
    axios.get.mockRejectedValue(err);

    const result = await reconcilePaymentById(payment);

    expect(result).toBe(false);
  });

  it("routes frameOrder payment to applyFrameOrderPaymentResult when Billplz confirms paid", async () => {
    const payment = makePayment({ paymentStatus: "pending", gatewayTransactionId: "bill-fo-y", frameOrder: "fo-id-2", booking: null });
    axios.get.mockResolvedValue({ data: { paid: true, paid_amount: "20000" } });

    FrameOrder.findById.mockResolvedValue({ _id: "fo-id-2", orderNumber: "FO-002" });

    const result = await reconcilePaymentById(payment);

    expect(result).toBe(true);
    expect(applyFrameOrderPaymentResult).toHaveBeenCalledWith(payment, expect.anything(), true, 20000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Data Flow tests — explicitly track variable transformations
// ─────────────────────────────────────────────────────────────────────────────

describe("[DataFlow] createBooking — total amount calculation and Billplz amount conversion", () => {
  beforeEach(() => jest.clearAllMocks());

  it("totalAmount = package.price (no addons) → multiplied by 100 before sending to Billplz (RM to cents)", async () => {
    Session.findById.mockResolvedValue(makeSession());
    Package.findById.mockResolvedValue({ price: 150 });
    Booking.create.mockResolvedValue(makeBooking());
    Payment.create.mockResolvedValue(makePayment());
    axios.post.mockResolvedValue({ data: { url: "https://pay.url", id: "bill-x" } });

    await createBooking({ session: "s1", package: "p1", graduate: "g1", addons: [] }, FAKE_USER);

    const sentAmount = axios.post.mock.calls[0][1].amount;
    expect(sentAmount).toBe(150 * 100);
  });

  it("totalAmount = package.price + sum(addon.prices) — each addon price flows into the running total", async () => {
    Session.findById.mockResolvedValue(makeSession());
    Package.findById.mockResolvedValue({ price: 150 });
    Addon.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ price: 20 }, { price: 30 }]) });
    Booking.create.mockResolvedValue(makeBooking());
    Payment.create.mockResolvedValue(makePayment());
    axios.post.mockResolvedValue({ data: { url: "https://pay.url", id: "bill-x" } });

    await createBooking({ session: "s1", package: "p1", graduate: "g1", addons: ["a1", "a2"] }, FAKE_USER);

    expect(axios.post.mock.calls[0][1].amount).toBe(200 * 100);
  });
});

describe("[DataFlow] handleBillplzCallback — payment amount conversion and booking state transitions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("paid_amount in cents → payment.paidAmount in RM (15000 cents → 150 RM)", async () => {
    const body = { id: "bill-123", paid: "true", paid_amount: "15000" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ gatewayTransactionId: "bill-123", paymentStatus: "pending" });
    Payment.findOne.mockResolvedValue(payment);

    const booking = makeBooking({ status: "pending", paymentStatus: "pending" });
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);
    Session.findById.mockResolvedValue(makeSession({ bookedCount: 0, capacity: 5 }));
    sendBookingConfirmation.mockResolvedValue(undefined);

    await handleBillplzCallback({ ...body, x_signature: sig });

    expect(payment.paidAmount).toBe(150);
  });

  it("payment.paidAmount → booking.totalPrice (value flows from payment record into booking record)", async () => {
    const body = { id: "bill-123", paid: "true", paid_amount: "15000" };
    const sig = makeBillplzSignature(body);
    const payment = makePayment({ gatewayTransactionId: "bill-123", paymentStatus: "pending" });
    Payment.findOne.mockResolvedValue(payment);

    const booking = makeBooking({ status: "pending", paymentStatus: "pending" });
    booking.bookingNumber = "BK-001";
    const chain = { populate: jest.fn().mockReturnThis(), then: (resolve) => Promise.resolve(booking).then(resolve) };
    Booking.findById.mockReturnValue(chain);
    Session.findById.mockResolvedValue(makeSession({ bookedCount: 0, capacity: 5 }));
    sendBookingConfirmation.mockResolvedValue(undefined);

    await handleBillplzCallback({ ...body, x_signature: sig });

    expect(booking.totalPrice).toBe(payment.paidAmount);
  });
});

describe("[DataFlow] cancelBooking — session bookedCount state transitions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("session status transitions from 'full' back to 'available' when bookedCount drops below capacity", async () => {
    const booking = makeBooking({ status: "booked", paymentStatus: "paid", session: "s1" });
    Booking.findById.mockResolvedValue(booking);
    const session = makeSession({ bookedCount: 3, capacity: 3, status: "full" });
    Session.findById.mockResolvedValue(session);

    await cancelBooking("id1");

    expect(session.bookedCount).toBe(2);
    expect(session.status).toBe("available");
  });
});
