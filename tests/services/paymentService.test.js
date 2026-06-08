import { jest, describe, it, expect, beforeEach } from "@jest/globals";

jest.mock("../../src/models/Payment.js", () => ({
  __esModule: true,
  default: { findById: jest.fn(), findOne: jest.fn() },
}));
jest.mock("../../src/models/Booking.js", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("../../src/models/FrameOrder.js", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

import Payment from "../../src/models/Payment.js";
import Booking from "../../src/models/Booking.js";
import FrameOrder from "../../src/models/FrameOrder.js";

import { getPaymentById, getPaymentStatus } from "../../src/services/paymentService.js";

// ─────────────────────────────────────────────────────────────────────────────
// getPaymentById
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] getPaymentById — not found vs found branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when payment not found (!payment branch)", async () => {
    Payment.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(getPaymentById("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns the payment document when found", async () => {
    const payment = { _id: "p1", paymentStatus: "pending" };
    Payment.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(payment) });
    expect(await getPaymentById("p1")).toEqual(payment);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPaymentStatus
// ─────────────────────────────────────────────────────────────────────────────

describe("[Branch] getPaymentStatus — payment routing branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when no payment found by gatewayTransactionId", async () => {
    Payment.findOne.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(getPaymentStatus("bill-nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("routes to booking lookup when payment.booking is set (booking branch)", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "paid", booking: "b1", frameOrder: null }),
    });
    Booking.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue({ bookingNumber: "BK-001" }) });

    const result = await getPaymentStatus("bill-123");
    expect(result).toEqual({ paymentStatus: "paid", bookingNumber: "BK-001" });
  });

  it("throws 404 when booking associated with payment is missing (!booking branch)", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "paid", booking: "b1", frameOrder: null }),
    });
    Booking.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(getPaymentStatus("bill-123")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("routes to frameOrder lookup when payment.frameOrder is set (frameOrder branch)", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "pending", booking: null, frameOrder: "fo1" }),
    });
    FrameOrder.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue({ orderNumber: "FO-001" }) });

    const result = await getPaymentStatus("bill-fo-1");
    expect(result).toEqual({ paymentStatus: "pending", orderNumber: "FO-001" });
  });

  it("throws 404 when frameOrder associated with payment is missing (!frameOrder branch)", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "pending", booking: null, frameOrder: "fo-gone" }),
    });
    FrameOrder.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(getPaymentStatus("bill-fo-miss")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 404 when payment has neither booking nor frameOrder (orphan payment branch)", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "pending", booking: null, frameOrder: null }),
    });
    await expect(getPaymentStatus("bill-orphan")).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("[Path] getPaymentStatus — complete execution paths", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Path 1 — payment not found: throws 404 immediately", async () => {
    Payment.findOne.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await expect(getPaymentStatus("x")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("Path 2 — booking payment found: returns bookingNumber", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "paid", booking: "b1", frameOrder: null }),
    });
    Booking.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue({ bookingNumber: "BK-001" }) });
    expect(await getPaymentStatus("bill-123")).toMatchObject({ bookingNumber: "BK-001" });
  });

  it("Path 3 — frameOrder payment found: returns orderNumber", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "pending", booking: null, frameOrder: "fo1" }),
    });
    FrameOrder.findById.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue({ orderNumber: "FO-001" }) });
    expect(await getPaymentStatus("bill-fo")).toMatchObject({ orderNumber: "FO-001" });
  });
});
