import {
  prisma,
  DocumentStatus,
  ReturnDirection,
  MovementType,
  ReferenceType,
} from "@nx-inventory/database";
import { applyStockMovement } from "./stockService";
import { EventCollector } from "@nx-inventory/events";

export class ReturnNotDraftError extends Error {}
export class BatchRequiredForReturnError extends Error {}

export async function listReturns(businessId: string) {
  return prisma.return.findMany({
    where: { businessId },
    include: { warehouse: true, sale: true, purchase: true, items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReturn(id: string) {
  return prisma.return.findUniqueOrThrow({
    where: { id },
    include: {
      warehouse: true,
      sale: true,
      purchase: true,
      items: { include: { variant: { include: { unit: true } }, batch: true } },
    },
  });
}

async function nextReturnNumber(businessId: string): Promise<string> {
  const count = await prisma.return.count({ where: { businessId } });
  return `RET-${String(count + 1).padStart(4, "0")}`;
}

/**
 * direction decides which reference is required — CUSTOMER_RETURN needs a
 * saleId (what's being returned to us), SUPPLIER_RETURN needs a purchaseId
 * (what we're sending back). The schema can't enforce this XOR itself, so
 * it's checked here.
 */
export async function createReturn(params: {
  businessId: string;
  warehouseId: string;
  direction: ReturnDirection;
  createdById: string;
  saleId?: string;
  purchaseId?: string;
  reason?: string;
}) {
  if (params.direction === ReturnDirection.CUSTOMER_RETURN && !params.saleId) {
    throw new Error("A customer return must reference the original sale.");
  }
  if (
    params.direction === ReturnDirection.SUPPLIER_RETURN &&
    !params.purchaseId
  ) {
    throw new Error("A supplier return must reference the original purchase.");
  }

  const returnNumber = await nextReturnNumber(params.businessId);

  return prisma.return.create({
    data: {
      businessId: params.businessId,
      warehouseId: params.warehouseId,
      direction: params.direction,
      createdById: params.createdById,
      saleId:
        params.direction === ReturnDirection.CUSTOMER_RETURN
          ? params.saleId
          : undefined,
      purchaseId:
        params.direction === ReturnDirection.SUPPLIER_RETURN
          ? params.purchaseId
          : undefined,
      reason: params.reason,
      returnNumber,
      status: DocumentStatus.DRAFT,
    },
  });
}

export async function addReturnItem(params: {
  returnId: string;
  variantId: string;
  quantity: number;
  batchId?: string;
  unitPrice?: number;
  note?: string;
}) {
  const ret = await prisma.return.findUniqueOrThrow({
    where: { id: params.returnId },
  });
  if (ret.status !== DocumentStatus.DRAFT) {
    throw new ReturnNotDraftError(
      `Return ${ret.returnNumber} is no longer a draft.`,
    );
  }

  // applyStockMovement auto-enforces "batch required" only for IN
  // movements — CUSTOMER_RETURN (RETURN_IN) is covered by that already.
  // SUPPLIER_RETURN (RETURN_OUT) is an OUT movement, which
  // applyStockMovement does NOT auto-check, so it's enforced here instead
  // — otherwise a batch-tracked supplier return with no batchId would
  // silently deduct Stock.quantity without touching any ProductBatch.
  if (ret.direction === ReturnDirection.SUPPLIER_RETURN) {
    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: params.variantId },
    });
    if (variant.trackingMode === "BATCH" && !params.batchId) {
      throw new BatchRequiredForReturnError(
        `${variant.name} is BATCH-tracked — a supplier return must specify which existing batch is being sent back.`,
      );
    }
  }

  return prisma.returnItem.create({
    data: {
      returnId: params.returnId,
      variantId: params.variantId,
      quantity: params.quantity,
      batchId: params.batchId,
      unitPrice: params.unitPrice,
      note: params.note,
    },
  });
}

export async function removeReturnItem(itemId: string) {
  const item = await prisma.returnItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { return: true },
  });
  if (item.return.status !== DocumentStatus.DRAFT) {
    throw new ReturnNotDraftError(
      `Return ${item.return.returnNumber} is no longer a draft.`,
    );
  }
  return prisma.returnItem.delete({ where: { id: itemId } });
}

/**
 * CUSTOMER_RETURN moves stock IN (goods physically came back); SUPPLIER_
 * RETURN moves stock OUT (goods are leaving to go back to the supplier).
 * BATCH-tracked items need an existing batchId either way — applyStockMovement
 * itself enforces that for BATCH-tracked variants (throws BatchRequiredError
 * if missing), so there's no need to duplicate that check here.
 */
export async function completeReturn(returnId: string, performedById: string) {
  const events = new EventCollector();

  const result = await prisma.$transaction(
    async (tx) => {
      const ret = await tx.return.findUniqueOrThrow({
        where: { id: returnId },
        include: { items: { include: { variant: true } } },
      });

      if (ret.status !== DocumentStatus.DRAFT) {
        throw new ReturnNotDraftError(
          `Return ${ret.returnNumber} has already been completed.`,
        );
      }
      if (ret.items.length === 0) {
        throw new Error(`Return ${ret.returnNumber} has no items.`);
      }

      const movementType =
        ret.direction === ReturnDirection.CUSTOMER_RETURN
          ? MovementType.RETURN_IN
          : MovementType.RETURN_OUT;

      for (const item of ret.items) {
        await applyStockMovement({
          tx,
          businessId: ret.businessId,
          warehouseId: ret.warehouseId,
          variantId: item.variantId,
          quantity: item.quantity,
          type: movementType,
          referenceType: ReferenceType.RETURN,
          referenceId: ret.id,
          batchId: item.batchId ?? undefined,
          performedById,
          note: item.note,
          events,
        });
      }

      return tx.return.update({
        where: { id: returnId },
        data: { status: DocumentStatus.COMPLETED },
      });
    },
    { timeout: 20_000, maxWait: 10_000 },
  );

  return { returnRecord: result, events: events.getAll() };
}
