import {
  prisma,
  DocumentStatus,
  MovementType,
  ReferenceType,
} from "@nx-inventory/database";
import { applyStockMovement } from "@nx-inventory/inventory";
import { EventCollector } from "@nx-inventory/events";

export class PurchaseNotDraftError extends Error {}

export async function listPurchases(businessId: string) {
  return prisma.purchase.findMany({
    where: { businessId },
    include: { supplier: true, warehouse: true, items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchase(id: string) {
  return prisma.purchase.findUniqueOrThrow({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      items: { include: { variant: { include: { unit: true } } } },
    },
  });
}

async function nextPurchaseNumber(businessId: string): Promise<string> {
  const count = await prisma.purchase.count({ where: { businessId } });
  return `PO-${String(count + 1).padStart(4, "0")}`;
}

export async function createPurchase(params: {
  businessId: string;
  supplierId: string;
  warehouseId: string;
  createdById: string;
  purchaseDate?: Date;
  note?: string;
}) {
  const purchaseNumber = await nextPurchaseNumber(params.businessId);

  return prisma.purchase.create({
    data: {
      businessId: params.businessId,
      supplierId: params.supplierId,
      warehouseId: params.warehouseId,
      createdById: params.createdById,
      purchaseNumber,
      purchaseDate: params.purchaseDate ?? new Date(),
      note: params.note,
      status: DocumentStatus.DRAFT,
    },
  });
}

/**
 * Only DRAFT purchases can have items added — once received, the
 * PurchaseItems are what receivePurchase already turned into real stock
 * movements, so editing them after the fact would silently desync the
 * ledger from what was actually recorded.
 */
export async function addPurchaseItem(params: {
  purchaseId: string;
  variantId: string;
  quantity: number;
  unitCost: number;
  /** Optional at add-item time — for BATCH-tracked variants, you may not
   * know the real batch/expiry until it physically arrives. Can also be
   * supplied later, right before receiving. */
  batchNumber?: string;
  expiryDate?: Date;
}) {
  const purchase = await prisma.purchase.findUniqueOrThrow({
    where: { id: params.purchaseId },
  });
  if (purchase.status !== DocumentStatus.DRAFT) {
    throw new PurchaseNotDraftError(
      `Purchase ${purchase.purchaseNumber} is no longer a draft.`,
    );
  }

  return prisma.purchaseItem.create({
    data: {
      purchaseId: params.purchaseId,
      variantId: params.variantId,
      quantity: params.quantity,
      unitCost: params.unitCost,
      totalCost: params.quantity * params.unitCost,
      batchNumber: params.batchNumber,
      expiryDate: params.expiryDate,
    },
  });
}

export async function removePurchaseItem(itemId: string) {
  const item = await prisma.purchaseItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { purchase: true },
  });
  if (item.purchase.status !== DocumentStatus.DRAFT) {
    throw new PurchaseNotDraftError(
      `Purchase ${item.purchase.purchaseNumber} is no longer a draft.`,
    );
  }
  return prisma.purchaseItem.delete({ where: { id: itemId } });
}

/**
 * The real version of what was sketched as an example much earlier in this
 * project — creates a ProductBatch per BATCH-tracked item (using whatever
 * batchNumber/expiryDate was captured on the item, or an auto-generated
 * fallback if none was given), then calls applyStockMovement for every
 * line item inside one transaction. Events are collected and only flushed
 * after the transaction commits — see EventCollector's own docs for why.
 */
export async function receivePurchase(
  purchaseId: string,
  performedById: string,
) {
  const events = new EventCollector();

  const result = await prisma.$transaction(
    async (tx) => {
      const purchase = await tx.purchase.findUniqueOrThrow({
        where: { id: purchaseId },
        include: { items: { include: { variant: true } } },
      });

      if (purchase.status !== DocumentStatus.DRAFT) {
        throw new PurchaseNotDraftError(
          `Purchase ${purchase.purchaseNumber} has already been received.`,
        );
      }

      if (purchase.items.length === 0) {
        throw new Error(
          `Purchase ${purchase.purchaseNumber} has no items to receive.`,
        );
      }

      for (const item of purchase.items) {
        let batchId: string | undefined;

        if (item.variant.trackingMode === "BATCH") {
          const batchNumber =
            item.batchNumber ??
            `${purchase.purchaseNumber}-${item.id.slice(-6)}`;
          const batch = await tx.productBatch.upsert({
            where: {
              warehouseId_variantId_batchNumber: {
                warehouseId: purchase.warehouseId,
                variantId: item.variantId,
                batchNumber,
              },
            },
            update: {},
            create: {
              variantId: item.variantId,
              warehouseId: purchase.warehouseId,
              batchNumber,
              expiryDate: item.expiryDate,
              unitCost: item.unitCost,
              quantity: 0,
            },
          });
          batchId = batch.id;
        }

        await applyStockMovement({
          tx,
          businessId: purchase.businessId,
          warehouseId: purchase.warehouseId,
          variantId: item.variantId,
          quantity: item.quantity,
          type: MovementType.PURCHASE,
          referenceType: ReferenceType.PURCHASE,
          referenceId: purchase.id,
          batchId,
          performedById,
          events,
        });
      }

      events.add({
        type: "purchase.received",
        businessId: purchase.businessId,
        purchaseId: purchase.id,
        warehouseId: purchase.warehouseId,
        supplierId: purchase.supplierId,
        occurredAt: new Date(),
      });

      return tx.purchase.update({
        where: { id: purchaseId },
        data: { status: DocumentStatus.COMPLETED },
      });
    },
    { timeout: 20_000, maxWait: 10_000 }, // same reasoning as the seed script's transaction
  );

  return { purchase: result, events: events.getAll() }
}
