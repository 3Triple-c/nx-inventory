import { eventBus } from '@nx-inventory/events'

/**
 * This is what packages/notifications/src/index.ts (or wherever you wire up
 * app startup — likely a single init file imported once by apps/web) would
 * look like. Call this once when the app boots.
 *
 * Note what this module does NOT need to know: nothing about Prisma, about
 * how a Sale or StockMovement is structured, or about which package emitted
 * the event. It only knows the event's shape from @nx-inventory/events —
 * that's the whole point of routing everything through one typed bus.
 */
export function registerNotificationHandlers() {
  eventBus.on('stock.below_reorder_level', async (event) => {
    // event is fully typed here as StockBelowReorderLevelEvent — try
    // renaming a field and see TypeScript complain.
    console.log(
      `[notify] Variant ${event.variantId} in warehouse ${event.warehouseId} ` +
        `dropped to ${event.currentQuantity} (reorder level ${event.reorderLevel}).`
    )
    // TODO: send an actual notification — email, WhatsApp, in-app — once
    // the notifications package has a real send() implementation.
  })

  eventBus.on('purchase.received', (event) => {
    console.log(`[notify] Purchase ${event.purchaseId} received into warehouse ${event.warehouseId}.`)
  })

  eventBus.on('sale.completed', (event) => {
    console.log(`[notify] Sale ${event.saleId} completed for ${event.total}.`)
  })
}

/**
 * The analytics or ai package would do the exact same thing with different
 * handlers — e.g. analytics might just persist every event to a
 * time-series-friendly table for later querying, while ai might invalidate
 * a cached "current stock summary" it keeps for fast chat answers.
 */