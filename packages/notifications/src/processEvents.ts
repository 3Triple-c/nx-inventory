import type { AppEvent } from "@nx-inventory/events";
import { createNotification } from "./services/notificationService";

/**
 * Replaces the eventBus/registerHandlers approach — that relied on an
 * in-memory singleton being the same object instance across module
 * boundaries, which Next.js does not guarantee (Turbopack can bundle
 * Server Actions and instrumentation.ts separately, and even if it
 * didn't, separate serverless invocations in production share no memory
 * at all).
 *
 * Call this directly, in the same function, right after whatever mutation
 * produced the events — e.g. in apps/web's Server Actions, right after
 * calling completeSale/receivePurchase/etc. That guarantees this code runs
 * in the exact same module graph as the call site, no registration step,
 * no timing dependency on instrumentation.ts having run first.
 */
export async function processEvents(
  events: readonly AppEvent[],
): Promise<void> {
  for (const event of events) {
    switch (event.type) {
      case "stock.below_reorder_level":
        await createNotification({
          businessId: event.businessId,
          type: event.type,
          message: `Stock for a product dropped to ${event.currentQuantity} (reorder level ${event.reorderLevel}).`,
          link: "/stock",
        });
        break;

      case "stock.batch_expiring_soon":
        await createNotification({
          businessId: event.businessId,
          type: event.type,
          message: `Batch ${event.batchNumber} expires in ${event.daysRemaining} day(s).`,
          link: "/stock",
        });
        break;

      case "stock.batch_expired":
        await createNotification({
          businessId: event.businessId,
          type: event.type,
          message: `Batch ${event.batchNumber} has expired.`,
          link: "/stock",
        });
        break;

      case "purchase.received":
        await createNotification({
          businessId: event.businessId,
          type: event.type,
          message: `Purchase received into stock.`,
          link: `/purchasing/${event.purchaseId}`,
        });
        break;

      case "sale.completed":
        await createNotification({
          businessId: event.businessId,
          type: event.type,
          message: `Sale completed for ₦${event.total}.`,
          link: `/sales/${event.saleId}`,
        });
        break;

      case "transfer.completed":
        await createNotification({
          businessId: event.businessId,
          type: event.type,
          message: `Stock transfer completed.`,
          link: `/transfers/${event.transferId}`,
        });
        break;

      case "adjustment.approved":
        await createNotification({
          businessId: event.businessId,
          type: event.type,
          message: `Adjustment (${event.adjustmentType}) approved.`,
          link: `/adjustments/${event.adjustmentId}`,
        });
        break;
    }
  }
}
