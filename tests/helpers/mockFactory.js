import { jest } from "@jest/globals";

export function makeUser(overrides = {}) {
  return {
    _id: "64f0000000000000000000a1",
    email: "user@test.com",
    fullName: "Test User",
    phone: "+60123456789",
    role: "graduate",
    password: "$2b$10$fakeHashedPassword12345678901",
    refreshToken: null,
    passwordResetToken: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

export function makeBooking(overrides = {}) {
  return {
    _id: "64f0000000000000000000b1",
    bookingNumber: "K70-20250604-001",
    graduate: "64f0000000000000000000a1",
    package: "64f0000000000000000000c1",
    session: "64f0000000000000000000d1",
    addons: [],
    status: "pending",
    paymentStatus: "pending",
    totalPrice: null,
    queue: null,
    shipment: null,
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeSession(overrides = {}) {
  return {
    _id: "64f0000000000000000000d1",
    date: new Date("2025-10-01"),
    startTime: "09:00",
    endTime: "09:30",
    capacity: 5,
    bookedCount: 0,
    status: "available",
    batchId: "batch_test",
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

export function makePayment(overrides = {}) {
  return {
    _id: "64f0000000000000000000e1",
    booking: "64f0000000000000000000b1",
    frameOrder: null,
    amount: 150,
    paidAmount: null,
    paymentStatus: "pending",
    gatewayTransactionId: "bill-abc-123",
    paymentUrl: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

export function makeFrameOrder(overrides = {}) {
  return {
    _id: "64f0000000000000000000f1",
    orderNumber: "FO-20250604-001",
    graduate: "64f0000000000000000000a1",
    status: "pending",
    paymentStatus: "pending",
    totalPrice: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

export function makeQueueEntry(overrides = {}) {
  return {
    _id: "64f000000000000000000011",
    booking: "64f0000000000000000000b1",
    status: "waiting",
    queueNumber: 1,
    studio: null,
    skippedCount: 0,
    checkInTime: new Date(),
    startTime: null,
    endTime: null,
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn().mockReturnValue({ status: "waiting", queueNumber: 1, ahead: 0 }),
    ...overrides,
  };
}
