import {
  prisma,
  TransferStatus,
  MovementType,
  ReferenceType,
} from "@nx-inventory/database";
import { applyStockMovement } from "./stockService";
import { EventCollector } from "@nx-inventory/events";

export class TransferNotDraftError extends Error {}
export class BatchRequiredForTransferError extends Error {}

export async function listTransfers(businessId: string) {
  return prisma.transfer.findMany({
    where: { businessId },
    include: { fromWarehouse: true, toWarehouse: true, items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTransfer(id: string) {
  return prisma.transfer.findUniqueOrThrow({
    where: { id },
    include: {
      fromWarehouse: true,
      toWarehouse: true,
      items: { include: { variant: { include: { unit: true } }, batch: true } },
    },
  });
}

async function nextTransferNumber(businessId: string): Promise<string> {
  const count = await prisma.transfer.count({ where: { businessId } });
  return `TR-${String(count + 1).padStart(4, "0")}`;
}

export async function createTransfer(params: {
  businessId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  createdById: string;
  note?: string;
}) {
  if (params.fromWarehouseId === params.toWarehouseId) {
    throw new Error("Source and destination warehouse must be different.");
  }

  const transferNumber = await nextTransferNumber(params.businessId);

  return prisma.transfer.create({
    data: {
      businessId: params.businessId,
      fromWarehouseId: params.fromWarehouseId,
      toWarehouseId: params.toWarehouseId,
      createdById: params.createdById,
      transferNumber,
      note: params.note,
      status: TransferStatus.DRAFT,
    },
  });
}

/**
 * BATCH-tracked variants require an explicit batchId — you're moving stock
 * you already physically have, from a specific batch that already exists
 * at the source warehouse, not creating new stock the way a purchase
 * would. There's no FEFO auto-pick here on purpose; that's for sales,
 * where nobody's choosing a batch by hand. A transfer is deliberate.
 */
export async function addTransferItem(params: {
  transferId: string;
  variantId: string;
  quantity: number;
  batchId?: string;
}) {
  const transfer = await prisma.transfer.findUniqueOrThrow({
    where: { id: params.transferId },
    include: { fromWarehouse: true },
  });
  if (transfer.status !== TransferStatus.DRAFT) {
    throw new TransferNotDraftError(
      `Transfer ${transfer.transferNumber} is no longer a draft.`,
    );
  }

  const variant = await prisma.productVariant.findUniqueOrThrow({
    where: { id: params.variantId },
  });
  if (variant.trackingMode === "BATCH" && !params.batchId) {
    throw new BatchRequiredForTransferError(
      `${variant.name} is BATCH-tracked — pick which batch to transfer from the source warehouse's available stock.`,
    );
  }

  return prisma.transferItem.create({
    data: {
      transferId: params.transferId,
      variantId: params.variantId,
      quantity: params.quantity,
      batchId: params.batchId,
    },
  });
}

export async function removeTransferItem(itemId: string) {
  const item = await prisma.transferItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { transfer: true },
  });
  if (item.transfer.status !== TransferStatus.DRAFT) {
    throw new TransferNotDraftError(
      `Transfer ${item.transfer.transferNumber} is no longer a draft.`,
    );
  }
  return prisma.transferItem.delete({ where: { id: itemId } });
}

/**
 * Two movements per item — TRANSFER_OUT at the source, TRANSFER_IN at the
 * destination — sharing one referenceId so the ledger shows them as one
 * event. For BATCH-tracked items, the destination batch is upserted to
 * mirror the source batch's number/expiry/cost, since a batch belongs to
 * one warehouse and the stock is now physically in a different one.
 */
export async function completeTransfer(
  transferId: string,
  performedById: string,
) {
  const events = new EventCollector();

  const result = await prisma.$transaction(
    async (tx) => {
      const transfer = await tx.transfer.findUniqueOrThrow({
        where: { id: transferId },
        include: { items: { include: { variant: true } } },
      });

      if (transfer.status !== TransferStatus.DRAFT) {
        throw new TransferNotDraftError(
          `Transfer ${transfer.transferNumber} has already been completed.`,
        );
      }
      if (transfer.items.length === 0) {
        throw new Error(`Transfer ${transfer.transferNumber} has no items.`);
      }

      for (const item of transfer.items) {
        let destinationBatchId: string | undefined;

        if (item.variant.trackingMode === "BATCH" && item.batchId) {
          const sourceBatch = await tx.productBatch.findUniqueOrThrow({
            where: { id: item.batchId },
          });

          const destBatch = await tx.productBatch.upsert({
            where: {
              warehouseId_variantId_batchNumber: {
                warehouseId: transfer.toWarehouseId,
                variantId: item.variantId,
                batchNumber: sourceBatch.batchNumber,
              },
            },
            update: {},
            create: {
              variantId: item.variantId,
              warehouseId: transfer.toWarehouseId,
              batchNumber: sourceBatch.batchNumber,
              expiryDate: sourceBatch.expiryDate,
              manufactureDate: sourceBatch.manufactureDate,
              unitCost: sourceBatch.unitCost,
              quantity: 0,
            },
          });
          destinationBatchId = destBatch.id;
        }

        await applyStockMovement({
          tx,
          businessId: transfer.businessId,
          warehouseId: transfer.fromWarehouseId,
          variantId: item.variantId,
          quantity: item.quantity,
          type: MovementType.TRANSFER_OUT,
          referenceType: ReferenceType.TRANSFER,
          referenceId: transfer.id,
          batchId: item.batchId ?? undefined,
          performedById,
          events,
        });

        await applyStockMovement({
          tx,
          businessId: transfer.businessId,
          warehouseId: transfer.toWarehouseId,
          variantId: item.variantId,
          quantity: item.quantity,
          type: MovementType.TRANSFER_IN,
          referenceType: ReferenceType.TRANSFER,
          referenceId: transfer.id,
          batchId: destinationBatchId,
          performedById,
          events,
        });
      }

      events.add({
        type: "transfer.completed",
        businessId: transfer.businessId,
        transferId: transfer.id,
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        occurredAt: new Date(),
      });

      return tx.transfer.update({
        where: { id: transferId },
        data: { status: TransferStatus.COMPLETED },
      });
    },
    { timeout: 20_000, maxWait: 10_000 },
  );

  return { transfer: result, events: events.getAll() };
}
