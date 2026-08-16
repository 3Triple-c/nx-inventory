import { prisma } from "@nx-inventory/database";

/**
 * Read-only by design — kept out of StockService on purpose, mirroring the
 * same split we settled on for MovementService: the writer (StockService's
 * applyStockMovement/consumeFefo) is the only thing allowed to touch
 * Stock/ProductBatch quantities, and everything here just reads what's
 * already there.
 */

/**
 * For pickers that need "which batches of this variant actually have stock
 * at this specific warehouse" — e.g. Transfer's batch selection, since
 * transferring moves a specific existing batch, not FEFO-consumes across
 * several like a sale would.
 */
/**
 * All in-stock batches at one warehouse, across every variant — used to
 * build a single flat picker for Transfer's batch selection, rather than
 * needing a dependent "pick variant, then pick batch" dropdown pair.
 */
export async function getAvailableBatchesForWarehouse(warehouseId: string) {
  return prisma.productBatch.findMany({
    where: { warehouseId, quantity: { gt: 0 } },
    include: { variant: { include: { unit: true, product: true } } },
    orderBy: { expiryDate: "asc" },
  });
}

export async function getAvailableBatches(
  warehouseId: string,
  variantId: string,
) {
  return prisma.productBatch.findMany({
    where: { warehouseId, variantId, quantity: { gt: 0 } },
    orderBy: { expiryDate: "asc" },
  });
}

/**
 * ALL batches at a warehouse, including ones currently at zero — unlike
 * getAvailableBatchesForWarehouse, this is for pickers where adding stock
 * BACK to a previously-emptied batch is valid (an IN-direction Adjustment,
 * e.g. correcting a stock count upward).
 */
export async function getAllBatchesForWarehouse(warehouseId: string) {
  return prisma.productBatch.findMany({
    where: { warehouseId },
    include: { variant: { include: { unit: true, product: true } } },
    orderBy: { batchNumber: "asc" },
  });
}

export async function getStockLevels(businessId: string) {
  return prisma.stock.findMany({
    where: { warehouse: { businessId } },
    include: {
      warehouse: true,
      variant: { include: { unit: true, product: true } },
    },
    orderBy: { variant: { product: { name: "asc" } } },
  });
}

/**
 * "Low stock" means a reorderLevel is actually set (many variants won't
 * have one yet) AND current quantity has dropped to or below it. Both
 * conditions matter — without the first, every untracked-threshold
 * variant would either always or never show up depending on how you
 * compare against null.
 */
export async function getLowStockItems(businessId: string) {
  const stocks = await prisma.stock.findMany({
    where: {
      warehouse: { businessId },
      reorderLevel: { not: null },
    },
    include: {
      warehouse: true,
      variant: { include: { unit: true, product: true } },
    },
  });

  return stocks.filter(
    (s) => s.reorderLevel != null && s.quantity.lte(s.reorderLevel),
  );
}

/**
 * Batches expiring within `daysAhead` (default 30) that still have stock —
 * an already-empty expired batch isn't actionable, so it's excluded.
 */
export async function getExpiringBatches(businessId: string, daysAhead = 30) {
  const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

  return prisma.productBatch.findMany({
    where: {
      warehouse: { businessId },
      quantity: { gt: 0 },
      expiryDate: { not: null, lte: cutoff },
    },
    include: {
      warehouse: true,
      variant: { include: { unit: true, product: true } },
    },
    orderBy: { expiryDate: "asc" },
  });
}
