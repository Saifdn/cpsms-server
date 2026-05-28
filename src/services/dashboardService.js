import Booking from "../models/Booking.js";
import Studio from "../models/Studio.js";
import Shipment from "../models/Shipment.js";
import Payment from "../models/Payment.js";
import Queue from "../models/Queue.js";
import User from "../models/User.js";
import Task from "../models/Task.js";

export async function getDashboardOverview(user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearEnd = new Date(today.getFullYear() + 1, 0, 1);

  const [
    expectedCustomersToday,
    checkedInToday,
    waitingInQueue,
    activeStudios,
    availableStudios,
    todayRevenueAgg,
    totalRevenueAgg,
    pendingShipments,
    bookingStatusAgg,
    monthlyRevenueAgg,
    queueSnapshot,
    recentBookings,
    shipmentStatusAgg,
    graduateCount,
    staffCount,
    myTasks,
  ] = await Promise.all([
    // 1. Expected customers today — booked sessions falling today
    Booking.aggregate([
      { $lookup: { from: "sessions", localField: "session", foreignField: "_id", as: "sessionData" } },
      { $unwind: "$sessionData" },
      { $match: { "sessionData.date": { $gte: today, $lt: tomorrow }, status: "booked" } },
      { $count: "total" },
    ]),

    // 2. Checked-in today
    Booking.countDocuments({
      updatedAt: { $gte: today, $lt: tomorrow },
      status: { $in: ["checked-in", "in-progress", "completed"] },
    }),

    // 3. Waiting in queue right now
    Queue.countDocuments({ status: "waiting" }),

    // 4. Studios currently occupied
    Studio.countDocuments({ isOccupied: true }),

    // 5. Studios available (not occupied, not disabled)
    Studio.countDocuments({ isAvailable: true, isOccupied: false }),

    // 6. Today's revenue
    Payment.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: "$paidAmount" } } },
    ]),

    // 7. All-time total revenue
    Payment.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$paidAmount" } } },
    ]),

    // 8. Pending shipments (not yet in transit or delivered)
    Shipment.countDocuments({ status: { $in: ["draft", "confirmed", "ready"] } }),

    // 9. Booking status breakdown for today
    Booking.aggregate([
      { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // 10. Monthly revenue for current year
    Payment.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: yearStart, $lt: yearEnd } } },
      { $group: { _id: { $month: "$createdAt" }, revenue: { $sum: "$paidAmount" } } },
      { $sort: { _id: 1 } },
    ]),

    // 11. Active queue snapshot
    Queue.find({ status: { $in: ["waiting", "called", "in-progress"] } })
      .sort({ queueNumber: 1 })
      .select("queueNumber status checkInTime booking")
      .populate("booking", "bookingNumber")
      .lean(),

    // 12. Recent 10 bookings
    Booking.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("bookingNumber status paymentStatus totalPrice createdAt graduate")
      .populate("graduate", "fullName")
      .lean(),

    // 13. Shipment status breakdown
    Shipment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

    // 14. Total graduates
    User.countDocuments({ role: "graduate" }),

    // 15. Total staff
    User.countDocuments({ role: "staff" }),

    // 16. Tasks assigned to this user (staff only) — use userId from JWT, not _id
    user.role === "staff"
      ? Task.find({ assignedTo: user.userId }).sort({ createdAt: -1 }).select("title description category").lean()
      : Promise.resolve([]),
  ]);

  const bookingStatusBreakdown = bookingStatusAgg.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const revenueByMonth = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyRevenueAgg.find((m) => m._id === i + 1);
    return { month: i + 1, revenue: found ? found.revenue : 0 };
  });

  const shipmentStatusBreakdown = shipmentStatusAgg.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return {
    kpi: {
      expectedCustomersToday: expectedCustomersToday[0]?.total ?? 0,
      checkedInToday,
      waitingInQueue,
      activeStudios,
      availableStudios,
      todayRevenue: todayRevenueAgg[0]?.total ?? 0,
      totalRevenue: totalRevenueAgg[0]?.total ?? 0,
      pendingShipments,
    },
    bookingStatusBreakdown,
    monthlyRevenue: revenueByMonth,
    queueSnapshot,
    recentBookings,
    shipmentStatusBreakdown,
    userCounts: { graduates: graduateCount, staff: staffCount },
    myTasks,
  };
}
