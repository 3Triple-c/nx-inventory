import type { AppEvent } from './types'
import type { EventBus } from './bus'

/**
 * Use this inside a Prisma transaction to gather events as they occur,
 * WITHOUT emitting them yet. Once `prisma.$transaction(...)` resolves
 * successfully — meaning the commit actually happened — flush the
 * collected events to the bus.
 *
 * This matters because of a bug class that's easy to introduce otherwise:
 * if you emit an event mid-transaction and a subscriber reacts immediately
 * (sends a notification, pings the AI layer), but the transaction later
 * rolls back, you've just told someone about a sale or stock change that
 * never actually happened. Collecting-then-flushing-after-commit makes that
 * impossible by construction.
 *
 * Usage:
 *
 *   const collector = new EventCollector()
 *
 *   const result = await prisma.$transaction(async (tx) => {
 *     const movementResult = await applyStockMovement({ tx, ... })
 *
 *     if (movementResult.newQuantity.lt(stock.reorderLevel ?? Infinity)) {
 *       collector.add({
 *         type: 'stock.below_reorder_level',
 *         businessId, warehouseId, variantId,
 *         currentQuantity: movementResult.newQuantity.toString(),
 *         reorderLevel: stock.reorderLevel!.toString(),
 *         occurredAt: new Date(),
 *       })
 *     }
 *
 *     return something
 *   })
 *
 *   // Only reached if the transaction committed successfully — if
 *   // $transaction throws, this line never runs and nothing was emitted.
 *   collector.flush(eventBus)
 */
export class EventCollector {
  private events: AppEvent[] = []

  add(event: AppEvent): void {
    this.events.push(event)
  }

  getAll(): readonly AppEvent[] {
    return this.events
  }

  flush(bus: Pick<EventBus, 'emitMany'>): void {
    bus.emitMany([...this.events])
    this.events = []
  }
}