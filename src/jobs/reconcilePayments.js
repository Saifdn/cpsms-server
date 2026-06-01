import cron from "node-cron";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import { reconcilePaymentById } from "../services/bookingService.js";

async function runReconciliation() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const stalePending = await Payment.find({
    paymentStatus: "pending",
    createdAt: { $lt: tenMinutesAgo },
  })
    .select("_id paymentStatus gatewayTransactionId booking createdAt")
    .lean();

  if (!stalePending.length) return;

  console.log(`[reconcile-cron] Found ${stalePending.length} stale pending payment(s). Reconciling...`);

  for (const payment of stalePending) {
    try {
      // No gatewayTransactionId means Billplz bill was never created — cancel directly
      if (!payment.gatewayTransactionId) {
        await Payment.findByIdAndUpdate(payment._id, { paymentStatus: "failed" });
        await Booking.findByIdAndUpdate(payment.booking, { status: "cancelled", paymentStatus: "failed" });
        console.log(`[reconcile-cron] Cancelled orphaned payment ${payment._id} (no bill ID)`);
        continue;
      }

      const changed = await reconcilePaymentById(payment);
      if (changed) {
        console.log(`[reconcile-cron] Reconciled payment ${payment._id} (bill: ${payment.gatewayTransactionId})`);
      }
    } catch (err) {
      console.error(`[reconcile-cron] Failed for payment ${payment._id}:`, err.message);
    }
  }
}

export function startReconciliationJob() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await runReconciliation();
    } catch (err) {
      console.error("[reconcile-cron] Unexpected error:", err);
    }
  });

  console.log("Reconciliation cron job started (every 5 minutes)");
}
