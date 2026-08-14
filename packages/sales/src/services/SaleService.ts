import {
  prisma,
  SaleStatus,
  PaymentStatus,
  PaymentMethod,
  MovementType,
  ReferenceType,
} from '@nx-inventory/database'
import { applyStockMovement, consumeFefo } from '@nx-inventory/inventory'
import { EventCollector, eventBus } from '@nx-inventory/events'

export class SaleNotDraftError extends Error {}

export async function listSales(businessId: string) {
  return prisma.sale.findMany({
    where: { businessId },
    include: { warehouse: true, customer: true, items: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getSale(id: string) {
  return prisma.sale.findUniqueOrThrow({
    where: { id },
    include: {
      warehouse: true,
      customer: true,
      items: { include: { variant: { include: { unit: true } } } },
    },
  })
}

async function nextSaleNumber(businessId: string): Promise<string> {
  const count = await prisma.sale.count({ where: { businessId } })
  return `SL-${String(count + 1).padStart(4, '0')}`
}

/**
 * subtotal/discount/tax/total start at 0 and get recomputed for real in
 * completeSale — a DRAFT sale's totals aren't meaningful until you know
 * the final item list. Tax is deliberately left at 0 throughout; real tax
 * handling belongs to the (currently stubbed) finance module, not bolted
 * on here.
 */
export async function createSale(params: {
  businessId: string
  warehouseId: string
  createdById: string
  customerId?: string
}) {
  const saleNumber = await nextSaleNumber(params.businessId)

  return prisma.sale.create({
    data: {
      businessId: params.businessId,
      warehouseId: params.warehouseId,
      customerId: params.customerId,
      createdById: params.createdById,
      saleNumber,
      status: SaleStatus.DRAFT,
      saleDate: new Date(),
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      paymentStatus: PaymentStatus.PENDING,
    },
  })
}

export async function addSaleItem(params: {
  saleId: string
  variantId: string
  quantity: number
  unitPrice: number
  discount?: number
}) {
  const sale = await prisma.sale.findUniqueOrThrow({ where: { id: params.saleId } })
  if (sale.status !== SaleStatus.DRAFT) {
    throw new SaleNotDraftError(`Sale ${sale.saleNumber} is no longer a draft.`)
  }

  const discount = params.discount ?? 0
  const total = params.quantity * params.unitPrice - discount

  return prisma.saleItem.create({
    data: {
      saleId: params.saleId,
      variantId: params.variantId,
      quantity: params.quantity,
      unitPrice: params.unitPrice,
      discount,
      total,
    },
  })
}

export async function removeSaleItem(itemId: string) {
  const item = await prisma.saleItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { sale: true },
  })
  if (item.sale.status !== SaleStatus.DRAFT) {
    throw new SaleNotDraftError(`Sale ${item.sale.saleNumber} is no longer a draft.`)
  }
  return prisma.saleItem.delete({ where: { id: itemId } })
}

/**
 * For each item: if it's on a BATCH-tracked variant and no specific batch
 * was pinned, consumeFefo picks batches oldest-expiry-first (the normal
 * case — a cashier isn't choosing a batch). Otherwise applyStockMovement
 * runs directly. Same collect-then-flush event pattern as receivePurchase.
 */
export async function completeSale(params: {
  saleId: string
  performedById: string
  paymentMethod: PaymentMethod
}) {
  const events = new EventCollector()

  const result = await prisma.$transaction(
    async (tx) => {
      const sale = await tx.sale.findUniqueOrThrow({
        where: { id: params.saleId },
        include: { items: { include: { variant: true } } },
      })

      if (sale.status !== SaleStatus.DRAFT) {
        throw new SaleNotDraftError(`Sale ${sale.saleNumber} has already been completed.`)
      }
      if (sale.items.length === 0) {
        throw new Error(`Sale ${sale.saleNumber} has no items to complete.`)
      }

      for (const item of sale.items) {
        if (item.variant.trackingMode === 'BATCH' && !item.batchId) {
          await consumeFefo({
            tx,
            businessId: sale.businessId,
            warehouseId: sale.warehouseId,
            variantId: item.variantId,
            quantity: item.quantity,
            type: MovementType.SALE,
            referenceType: ReferenceType.SALE,
            referenceId: sale.id,
            performedById: params.performedById,
            events,
          })
        } else {
          await applyStockMovement({
            tx,
            businessId: sale.businessId,
            warehouseId: sale.warehouseId,
            variantId: item.variantId,
            quantity: item.quantity,
            type: MovementType.SALE,
            referenceType: ReferenceType.SALE,
            referenceId: sale.id,
            batchId: item.batchId ?? undefined,
            performedById: params.performedById,
            events,
          })
        }
      }

      const subtotal = sale.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0)
      const discount = sale.items.reduce((s, i) => s + Number(i.discount), 0)
      const total = subtotal - discount

      events.add({
        type: 'sale.completed',
        businessId: sale.businessId,
        saleId: sale.id,
        warehouseId: sale.warehouseId,
        customerId: sale.customerId,
        total: total.toString(),
        occurredAt: new Date(),
      })

      return tx.sale.update({
        where: { id: params.saleId },
        data: {
          status: SaleStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: params.paymentMethod,
          subtotal,
          discount,
          tax: 0,
          total,
        },
      })
    },
    { timeout: 20_000, maxWait: 10_000 }
  )

  events.flush(eventBus)
  return result
}