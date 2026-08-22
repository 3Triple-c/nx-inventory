import { eventBus } from '@nx-inventory/events'
import { createNotification } from './services/notificationService'

/**
 * Call this exactly once when the app boots — see apps/web/instrumentation.ts.
 * Registering it more than once would attach duplicate listeners and
 * create two notification rows per event.
 *
 * Deliberately business-scoped, not per-user: Phase 1/2 assume one active
 * business per user, so every member sees the same notification feed for
 * their business. If Phase 3's multi-business/multi-member support ever
 * needs per-user targeting (e.g. "only notify the OWNER"), that's a
 * Membership-role filter added here, not a schema change.
 */
export function registerNotificationHandlers() {
  eventBus.on('stock.below_reorder_level', async (event) => {
    await createNotification({
      businessId: event.businessId,
      type: event.type,
      message: `Stock for a product dropped to ${event.currentQuantity} (reorder level ${event.reorderLevel}).`,
      link: '/stock',
    })
  })

  eventBus.on('stock.batch_expiring_soon', async (event) => {
    await createNotification({
      businessId: event.businessId,
      type: event.type,
      message: `Batch ${event.batchNumber} expires in ${event.daysRemaining} day(s).`,
      link: '/stock',
    })
  })

  eventBus.on('stock.batch_expired', async (event) => {
    await createNotification({
      businessId: event.businessId,
      type: event.type,
      message: `Batch ${event.batchNumber} has expired.`,
      link: '/stock',
    })
  })

  eventBus.on('purchase.received', async (event) => {
    await createNotification({
      businessId: event.businessId,
      type: event.type,
      message: `Purchase received into stock.`,
      link: `/purchasing/${event.purchaseId}`,
    })
  })

  eventBus.on('sale.completed', async (event) => {
    await createNotification({
      businessId: event.businessId,
      type: event.type,
      message: `Sale completed for ₦${event.total}.`,
      link: `/sales/${event.saleId}`,
    })
  })

  eventBus.on('transfer.completed', async (event) => {
    await createNotification({
      businessId: event.businessId,
      type: event.type,
      message: `Stock transfer completed.`,
      link: `/transfers/${event.transferId}`,
    })
  })

  eventBus.on('adjustment.approved', async (event) => {
    await createNotification({
      businessId: event.businessId,
      type: event.type,
      message: `Adjustment (${event.adjustmentType}) approved.`,
      link: `/adjustments/${event.adjustmentId}`,
    })
  })
}