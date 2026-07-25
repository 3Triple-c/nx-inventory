import { Prisma, MovementType, ReferenceType, TrackingMode } from '@prisma/client'
import { Decimal } from '@prisma/client-runtime-utils'
import type { EventCollector } from '@nx-inventory/events'

/**
 * applyStockMovement is the ONLY function in the codebase allowed to change
 * Stock.quantity or ProductBatch.quantity. Every module — Purchase, Sale,
 * Transfer, Adjustment, and anything else you add later (Production,
 * Consumption) — must go through this function instead of writing to those
 * tables directly.
 *
 * Why this matters: Stock.quantity is a cached rollup of ProductBatch
 * quantities for batch-tracked variants. If two code paths are allowed to
 * touch quantities independently, they will eventually drift apart, and the
 * moment that happens, every "how much stock do we have" answer — from a
 * dashboard or from the AI layer — becomes untrustworthy. Funneling every
 * write through one function is what keeps that impossible.
 *
 * Must always be called inside an existing Prisma transaction (`tx`), so the
 * Stock/ProductBatch update and the StockMovement ledger entry either both
 * commit or both roll back together.
 */

export type TxClient = Prisma.TransactionClient

export class InsufficientStockError extends Error {}
export class BatchRequiredError extends Error {}
export class InvalidMovementError extends Error {}

// Single source of truth for "does this movement type add or remove stock".
// Derived internally rather than accepted as a parameter — a caller passing
// a mismatched type/direction pair (e.g. type: SALE, direction: IN) is a bug
// class we can just remove entirely.
const MOVEMENT_DIRECTION: Record<MovementType, 'IN' | 'OUT'> = {
  PURCHASE: 'IN',
  SALE: 'OUT',
  RETURN_IN: 'IN',
  RETURN_OUT: 'OUT',
  TRANSFER_IN: 'IN',
  TRANSFER_OUT: 'OUT',
  ADJUSTMENT_IN: 'IN',
  ADJUSTMENT_OUT: 'OUT',
  DAMAGE: 'OUT',
  EXPIRED: 'OUT',
  PRODUCTION: 'IN',
  CONSUMPTION: 'OUT',
  LOST: 'OUT',
  OPENING_STOCK: 'IN',
}

export interface ApplyStockMovementParams {
  tx: TxClient
  businessId: string
  warehouseId: string
  variantId: string
  /** Always positive. Direction is derived from `type`, not from the sign. */
  quantity: Decimal | number | string
  type: MovementType
  referenceType?: ReferenceType
  referenceId?: string
  /**
   * Required for IN movements on a BATCH-tracked variant (you must create
   * or specify the ProductBatch you're adding to). Optional for OUT
   * movements — if omitted on a BATCH-tracked variant, use consumeFefo()
   * instead of calling this directly, since a single OUT movement may need
   * to span multiple batches.
   */
  batchId?: string | null
  performedById?: string | null
  reason?: string | null
  note?: string | null
  /** Escape hatch for known exceptions (e.g. correcting historical data). Default false. */
  allowNegativeStock?: boolean
  /**
   * Optional. If passed, this movement will add domain events to it (e.g.
   * stock.below_reorder_level) instead of emitting them immediately. The
   * caller is responsible for flushing the collector to the event bus only
   * after the surrounding `prisma.$transaction(...)` has committed — see
   * EventCollector's doc comment in the events package.
   */
  events?: EventCollector
}

export interface StockMovementResult {
  stockId: string
  newQuantity: Decimal
  movement: Awaited<ReturnType<TxClient['stockMovement']['create']>>
}

export async function applyStockMovement(
  params: ApplyStockMovementParams
): Promise<StockMovementResult> {
  const {
    tx,
    businessId,
    warehouseId,
    variantId,
    type,
    referenceType,
    referenceId,
    batchId,
    performedById,
    reason,
    note,
    allowNegativeStock = false,
    events,
  } = params

  const quantity = new Decimal(params.quantity)
  if (quantity.lte(0)) {
    throw new InvalidMovementError(
      'applyStockMovement: quantity must be a positive number; direction comes from `type`.'
    )
  }

  const direction = MOVEMENT_DIRECTION[type]
  const signedQty = direction === 'IN' ? quantity : quantity.negated()

  // Enforce that batch-tracked variants can't silently skip batch tracking,
  // and that non-tracked variants aren't given a batchId that would make
  // Stock and ProductBatch drift out of sync in different ways.
  const variant = await tx.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { trackingMode: true },
  })

  if (variant.trackingMode === TrackingMode.BATCH && direction === 'IN' && !batchId) {
    throw new BatchRequiredError(
      `Variant ${variantId} is BATCH-tracked. IN movements must specify a batchId — create the ProductBatch first (e.g. when receiving a purchase) and pass its id in.`
    )
  }

  if (variant.trackingMode === TrackingMode.NONE && batchId) {
    throw new InvalidMovementError(
      `Variant ${variantId} has trackingMode NONE but a batchId was passed. Either mark the variant as BATCH-tracked or stop passing a batchId.`
    )
  }

  // 1. Get-or-create the Stock row, then take a row lock on it so two
  // concurrent movements against the same warehouse+variant serialize
  // instead of both reading the same starting quantity and racing.
  // Prisma's query API has no SELECT ... FOR UPDATE, so this step uses raw SQL.
  let stock = await tx.stock.findUnique({
    where: { warehouseId_variantId: { warehouseId, variantId } },
  })

  if (!stock) {
    stock = await tx.stock.create({
      data: { warehouseId, variantId, quantity: 0 },
    })
  }

  await tx.$queryRaw`SELECT id FROM "Stock" WHERE id = ${stock.id} FOR UPDATE`

  // Re-read after acquiring the lock in case another transaction changed it
  // between our read above and the lock being granted.
  stock = await tx.stock.findUniqueOrThrow({ where: { id: stock.id } })

  const newQuantity = stock.quantity.plus(signedQty)

  if (!allowNegativeStock && newQuantity.lt(0)) {
    throw new InsufficientStockError(
      `Insufficient stock for variant ${variantId} in warehouse ${warehouseId}: have ${stock.quantity}, tried to remove ${quantity}.`
    )
  }

  // 2. If a batch is involved, update it under the same lock/transaction.
  if (batchId) {
    const batch = await tx.productBatch.findUniqueOrThrow({ where: { id: batchId } })
    const newBatchQuantity = batch.quantity.plus(signedQty)

    if (!allowNegativeStock && newBatchQuantity.lt(0)) {
      throw new InsufficientStockError(
        `Insufficient stock in batch ${batch.batchNumber}: have ${batch.quantity}, tried to remove ${quantity}.`
      )
    }

    await tx.productBatch.update({
      where: { id: batchId },
      data: { quantity: newBatchQuantity },
    })
  }

  // 3. Update the cached rollup.
  await tx.stock.update({
    where: { id: stock.id },
    data: { quantity: newQuantity },
  })

  // Fire stock.below_reorder_level only on the transition into low stock —
  // i.e. we were above reorderLevel before this movement and are at/below it
  // now. Without this check, every subsequent sale on an already-low item
  // would re-fire the event and spam notifications.
  if (
    events &&
    stock.reorderLevel != null &&
    stock.quantity.gt(stock.reorderLevel) &&
    newQuantity.lte(stock.reorderLevel)
  ) {
    events.add({
      type: 'stock.below_reorder_level',
      businessId,
      warehouseId,
      variantId,
      currentQuantity: newQuantity.toString(),
      reorderLevel: stock.reorderLevel.toString(),
      occurredAt: new Date(),
    })
  }

  // 4. Write the immutable ledger entry last, once we know the final balance.
  const movement = await tx.stockMovement.create({
    data: {
      businessId,
      warehouseId,
      variantId,
      batchId: batchId ?? null,
      stockId: stock.id,
      performedById: performedById ?? null,
      quantity: signedQty,
      balanceAfter: newQuantity,
      type,
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
      reason: reason ?? null,
      note: note ?? null,
    },
  })

  return { stockId: stock.id, newQuantity, movement }
}

/**
 * For OUT movements on a BATCH-tracked variant where the caller doesn't (or
 * can't reasonably) pick a specific batch — e.g. a sale that just needs "5
 * units of this product", not "5 units specifically from batch #12".
 *
 * Consumes batches oldest-expiry-first (FEFO — first-expire, first-out),
 * which is the standard rule for perishables/pharmacy stock. Batches with no
 * expiry date are treated as consumed last.
 *
 * Emits one StockMovement per batch touched, since each batch's balanceAfter
 * needs its own ledger row.
 */
export async function consumeFefo(params: {
  tx: TxClient
  businessId: string
  warehouseId: string
  variantId: string
  quantity: Decimal | number | string
  type: MovementType
  referenceType?: ReferenceType
  referenceId?: string
  performedById?: string | null
  reason?: string | null
  note?: string | null
  events?: EventCollector
}): Promise<StockMovementResult[]> {
  const direction = MOVEMENT_DIRECTION[params.type]
  if (direction !== 'OUT') {
    throw new InvalidMovementError('consumeFefo is only for OUT movement types.')
  }

  let remaining = new Decimal(params.quantity)
  if (remaining.lte(0)) {
    throw new InvalidMovementError('consumeFefo: quantity must be positive.')
  }

  const candidateBatches = await params.tx.productBatch.findMany({
    where: {
      variantId: params.variantId,
      warehouseId: params.warehouseId,
      quantity: { gt: 0 },
    },
  })

  // Sort with expiring-soonest first; batches with no expiry go last.
  const sorted = candidateBatches.sort((a, b) => {
    if (a.expiryDate && b.expiryDate) return a.expiryDate.getTime() - b.expiryDate.getTime()
    if (a.expiryDate && !b.expiryDate) return -1
    if (!a.expiryDate && b.expiryDate) return 1
    return 0
  })

  const results: StockMovementResult[] = []

  for (const batch of sorted) {
    if (remaining.lte(0)) break
    const take = Decimal.min(remaining, batch.quantity)
    if (take.lte(0)) continue

    const result = await applyStockMovement({
      tx: params.tx,
      businessId: params.businessId,
      warehouseId: params.warehouseId,
      variantId: params.variantId,
      quantity: take,
      type: params.type,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      batchId: batch.id,
      performedById: params.performedById,
      reason: params.reason,
      note: params.note,
      events: params.events,
    })

    results.push(result)
    remaining = remaining.minus(take)
  }

  if (remaining.gt(0)) {
    throw new InsufficientStockError(
      `Insufficient batch stock for variant ${params.variantId} in warehouse ${params.warehouseId}: short by ${remaining}.`
    )
  }

  return results
}