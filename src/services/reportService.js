import Booking from "../models/Booking.js";
import Session from "../models/Session.js";

function parseDateParam(query) {
  const { period, startDate, endDate } = query;

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, label: "custom" };
  }

  const now = new Date();
  const label = period || "all";

  if (label === "all") {
    return { startDate: null, endDate: null, label: "all" };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (label === "today") {
    return { startDate: start, endDate: end, label };
  }

  if (label === "week") {
    const day = start.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    start.setDate(start.getDate() + diffToMonday);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, label };
  }

  if (label === "month") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, label };
  }

  // default — all dates
  return { startDate: null, endDate: null, label: "all" };
}

export async function getEventSummary(query) {
  const { startDate, endDate, label } = parseDateParam(query);

  const dateFilter = startDate && endDate
    ? { "sessionDoc.date": { $gte: startDate, $lte: endDate } }
    : {};

  const baseMatch = { paymentStatus: "paid" };

  const sessionLookup = [
    { $lookup: { from: "sessions", localField: "session", foreignField: "_id", as: "sessionDoc" } },
    { $unwind: "$sessionDoc" },
    ...(startDate && endDate ? [{ $match: { "sessionDoc.date": { $gte: startDate, $lte: endDate } } }] : []),
  ];

  // Get all distinct session dates — these form the backbone of eventDays
  const sessionDateFilter = startDate && endDate
    ? { date: { $gte: startDate, $lte: endDate } }
    : {};

  const [packageRows, addonRows, totalRows, allSessionDates] = await Promise.all([
    // Packages per session date
    Booking.aggregate([
      { $match: baseMatch },
      ...sessionLookup,
      { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "packageDoc" } },
      { $unwind: "$packageDoc" },
      {
        $group: {
          _id: { date: "$sessionDoc.date", packageId: "$package" },
          packageName: { $first: "$packageDoc.name" },
          packagePrice: { $first: "$packageDoc.price" },
          qty: { $sum: 1 },
          revenue: { $sum: "$packageDoc.price" },
        },
      },
      { $sort: { "_id.date": 1, revenue: -1 } },
    ]),

    // Addons per session date
    Booking.aggregate([
      { $match: baseMatch },
      ...sessionLookup,
      { $unwind: "$addons" },
      { $lookup: { from: "addons", localField: "addons", foreignField: "_id", as: "addonDoc" } },
      { $unwind: "$addonDoc" },
      {
        $group: {
          _id: { date: "$sessionDoc.date", addonId: "$addons" },
          addonName: { $first: "$addonDoc.name" },
          addonPrice: { $first: "$addonDoc.price" },
          qty: { $sum: 1 },
          revenue: { $sum: "$addonDoc.price" },
        },
      },
      { $sort: { "_id.date": 1, qty: -1 } },
    ]),

    // Total paid bookings + revenue per session date
    Booking.aggregate([
      { $match: baseMatch },
      ...sessionLookup,
      {
        $group: {
          _id: "$sessionDoc.date",
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // All distinct session dates (including days with zero bookings)
    Session.aggregate([
      { $match: sessionDateFilter },
      { $group: { _id: "$date" } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Build maps keyed by date string
  const pkgByDate = new Map();
  for (const row of packageRows) {
    const key = row._id.date.toISOString().slice(0, 10);
    if (!pkgByDate.has(key)) pkgByDate.set(key, []);
    pkgByDate.get(key).push({
      packageId: row._id.packageId,
      name: row.packageName,
      price: row.packagePrice,
      qty: row.qty,
      revenue: row.revenue,
    });
  }

  const addonByDate = new Map();
  for (const row of addonRows) {
    const key = row._id.date.toISOString().slice(0, 10);
    if (!addonByDate.has(key)) addonByDate.set(key, []);
    addonByDate.get(key).push({
      addonId: row._id.addonId,
      name: row.addonName,
      price: row.addonPrice,
      qty: row.qty,
      revenue: row.revenue,
    });
  }

  // Index paid booking totals by date string for fast lookup
  const totalByDate = new Map();
  for (const row of totalRows) {
    totalByDate.set(row._id.toISOString().slice(0, 10), row);
  }

  // Build eventDays[] using ALL session dates as the source — zero-fill days with no bookings
  const eventDays = allSessionDates.map((row) => {
    const key = row._id.toISOString().slice(0, 10);
    const packages = pkgByDate.get(key) ?? [];
    const addons = addonByDate.get(key) ?? [];
    const packageRevenue = packages.reduce((s, p) => s + p.revenue, 0);
    const addonRevenue = addons.reduce((s, a) => s + a.revenue, 0);
    const booked = totalByDate.get(key);
    return {
      date: key,
      totalBookings: booked?.totalBookings ?? 0,
      packages,
      addons,
      grandTotal: packageRevenue + addonRevenue,
    };
  });

  // Overall rollup — sum packages across all dates
  const overallPkgMap = new Map();
  for (const row of packageRows) {
    const id = row._id.packageId.toString();
    if (!overallPkgMap.has(id)) {
      overallPkgMap.set(id, {
        packageId: row._id.packageId,
        name: row.packageName,
        price: row.packagePrice,
        qty: 0,
        revenue: 0,
      });
    }
    const entry = overallPkgMap.get(id);
    entry.qty += row.qty;
    entry.revenue += row.revenue;
  }

  const overallAddonMap = new Map();
  for (const row of addonRows) {
    const id = row._id.addonId.toString();
    if (!overallAddonMap.has(id)) {
      overallAddonMap.set(id, {
        addonId: row._id.addonId,
        name: row.addonName,
        price: row.addonPrice,
        qty: 0,
        revenue: 0,
      });
    }
    const entry = overallAddonMap.get(id);
    entry.qty += row.qty;
    entry.revenue += row.revenue;
  }

  const packageBreakdown = [...overallPkgMap.values()].sort((a, b) => b.revenue - a.revenue);
  const addonBreakdown = [...overallAddonMap.values()].sort((a, b) => b.qty - a.qty);
  const grandTotal = packageBreakdown.reduce((s, p) => s + p.revenue, 0)
    + addonBreakdown.reduce((s, a) => s + a.revenue, 0);

  return {
    period: {
      label,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    },
    eventDays,
    overall: {
      totalDays: eventDays.length,
      totalBookings: eventDays.reduce((s, d) => s + d.totalBookings, 0),
      packageBreakdown,
      addonBreakdown,
      grandTotal,
    },
  };
}

export async function getDailyReport(query) {
  const { date } = query;
  if (!date) {
    const err = new Error("date query param is required (YYYY-MM-DD)");
    err.statusCode = 400;
    throw err;
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const sessionLookup = [
    { $lookup: { from: "sessions", localField: "session", foreignField: "_id", as: "sessionDoc" } },
    { $unwind: "$sessionDoc" },
    { $match: { "sessionDoc.date": { $gte: dayStart, $lte: dayEnd } } },
  ];

  const baseMatch = { paymentStatus: "paid" };

  const [packageRows, addonRows, totalRow, sessions] = await Promise.all([
    Booking.aggregate([
      { $match: baseMatch },
      ...sessionLookup,
      { $lookup: { from: "packages", localField: "package", foreignField: "_id", as: "packageDoc" } },
      { $unwind: "$packageDoc" },
      {
        $group: {
          _id: "$package",
          packageName: { $first: "$packageDoc.name" },
          packagePrice: { $first: "$packageDoc.price" },
          qty: { $sum: 1 },
          revenue: { $sum: "$packageDoc.price" },
        },
      },
      { $sort: { revenue: -1 } },
    ]),

    Booking.aggregate([
      { $match: baseMatch },
      ...sessionLookup,
      { $unwind: "$addons" },
      { $lookup: { from: "addons", localField: "addons", foreignField: "_id", as: "addonDoc" } },
      { $unwind: "$addonDoc" },
      {
        $group: {
          _id: "$addons",
          addonName: { $first: "$addonDoc.name" },
          addonPrice: { $first: "$addonDoc.price" },
          qty: { $sum: 1 },
          revenue: { $sum: "$addonDoc.price" },
        },
      },
      { $sort: { qty: -1 } },
    ]),

    Booking.aggregate([
      { $match: baseMatch },
      ...sessionLookup,
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]),

    Session.find({ date: { $gte: dayStart, $lte: dayEnd } })
      .select("startTime endTime capacity bookedCount")
      .sort({ startTime: 1 })
      .lean(),
  ]);

  const packages = packageRows.map((r) => ({
    packageId: r._id,
    name: r.packageName,
    price: r.packagePrice,
    qty: r.qty,
    revenue: r.revenue,
  }));

  const addons = addonRows.map((r) => ({
    addonId: r._id,
    name: r.addonName,
    price: r.addonPrice,
    qty: r.qty,
    revenue: r.revenue,
  }));

  const sessionList = sessions.map((s) => ({
    sessionId: s._id,
    startTime: s.startTime,
    endTime: s.endTime,
    capacity: s.capacity,
    bookedCount: s.bookedCount,
    utilizationPct: s.capacity > 0
      ? Math.round((s.bookedCount / s.capacity) * 1000) / 10
      : 0,
  }));

  const packageRevenue = packages.reduce((s, p) => s + p.revenue, 0);
  const addonRevenue = addons.reduce((s, a) => s + a.revenue, 0);

  return {
    date,
    sessions: sessionList,
    totalBookings: totalRow[0]?.totalBookings ?? 0,
    packages,
    addons,
    grandTotal: packageRevenue + addonRevenue,
  };
}
