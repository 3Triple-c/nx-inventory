/**
 * Domain events for the platform. This is the shared vocabulary that
 * notifications, analytics, and the AI package subscribe to — none of them
 * should need to know how a Sale or Adjustment is structured internally,
 * only that these events happened.
 *
 * Add new event types here as new modules need them. Keep payloads small
 * and serializable (string/number/Date, no Prisma model instances) — these
 * may eventually cross a process boundary (queue, webhook) even though
 * today they don't.
 */

export interface StockBelowReorderLevelEvent {
  type: 'stock.below_reorder_level'
  businessId: string
  warehouseId: string
  variantId: string
  currentQuantity: string
  reorderLevel: string
  occurredAt: Date
}

export interface BatchExpiringSoonEvent {
  type: 'stock.batch_expiring_soon'
  businessId: string
  warehouseId: string
  variantId: string
  batchId: string
  batchNumber: string
  expiryDate: Date
  daysRemaining: number
  occurredAt: Date
}

export interface BatchExpiredEvent {
  type: 'stock.batch_expired'
  businessId: string
  warehouseId: string
  variantId: string
  batchId: string
  batchNumber: string
  expiryDate: Date
  occurredAt: Date
}

export interface PurchaseReceivedEvent {
  type: 'purchase.received'
  businessId: string
  purchaseId: string
  warehouseId: string
  supplierId: string
  occurredAt: Date
}

export interface SaleCompletedEvent {
  type: 'sale.completed'
  businessId: string
  saleId: string
  warehouseId: string
  customerId: string | null
  total: string
  occurredAt: Date
}

export interface TransferCompletedEvent {
  type: 'transfer.completed'
  businessId: string
  transferId: string
  fromWarehouseId: string
  toWarehouseId: string
  occurredAt: Date
}

export interface AdjustmentApprovedEvent {
  type: 'adjustment.approved'
  businessId: string
  adjustmentId: string
  warehouseId: string
  adjustmentType: string
  occurredAt: Date
}

/**
 * Discriminated union of every event in the system. Adding a new event type
 * to this union is enough to get full type-checking on `eventBus.on(...)`
 * handlers elsewhere — TypeScript will narrow the payload based on `type`.
 */
export type AppEvent =
  | StockBelowReorderLevelEvent
  | BatchExpiringSoonEvent
  | BatchExpiredEvent
  | PurchaseReceivedEvent
  | SaleCompletedEvent
  | TransferCompletedEvent
  | AdjustmentApprovedEvent

export type AppEventType = AppEvent['type']