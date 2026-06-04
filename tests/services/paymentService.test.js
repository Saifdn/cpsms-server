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

describe("getPaymentById", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when payment not found", async () => {
    Payment.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(getPaymentById("nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns the payment when found", async () => {
    const payment = { _id: "p1", paymentStatus: "pending" };
    Payment.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(payment) });
    const result = await getPaymentById("p1");
    expect(result).toEqual(payment);
  });
});

describe("getPaymentStatus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when payment not found by gatewayTransactionId", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });
    await expect(getPaymentStatus("bill-nonexistent")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns paymentStatus and bookingNumber when payment has a booking", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "paid", booking: "b1", frameOrder: null }),
    });
    Booking.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ bookingNumber: "BK-001" }),
    });

    const result = await getPaymentStatus("bill-123");
    expect(result).toEqual({ paymentStatus: "paid", bookingNumber: "BK-001" });
  });

  it("throws 404 when booking associated with payment is missing", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "paid", booking: "b1", frameOrder: null }),
    });
    Booking.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(getPaymentStatus("bill-123")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns paymentStatus and orderNumber when payment has a frameOrder", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "pending", booking: null, frameOrder: "fo1" }),
    });
    FrameOrder.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ orderNumber: "FO-001" }),
    });

    const result = await getPaymentStatus("bill-fo-1");
    expect(result).toEqual({ paymentStatus: "pending", orderNumber: "FO-001" });
  });

  it("throws 404 when frameOrder associated with payment is missing", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "pending", booking: null, frameOrder: "fo-gone" }),
    });
    FrameOrder.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(getPaymentStatus("bill-fo-miss")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 404 when payment has neither booking nor frameOrder", async () => {
    Payment.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ paymentStatus: "pending", booking: null, frameOrder: null }),
    });

    await expect(getPaymentStatus("bill-orphan")).rejects.toMatchObject({ statusCode: 404 });
  });
});
