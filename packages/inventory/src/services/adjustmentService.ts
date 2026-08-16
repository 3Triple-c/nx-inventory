import {
  prisma,
  AdjustmentStatus,
  AdjustmentType,
  AdjustmentDirection,
  UserRole,
  MovementType,
  ReferenceType,
} from "@nx-inventory/database";
import { applyStockMovement } from "./stockService";
import { EventCollector, eventBus } from "@nx-inventory/events";

export class AdjustmentNotDraftError extends Error {}
export class InsufficientPermissionError extends Error {}
export class BatchRequiredForAdjustmentError extends Error {}

// Deliberately not blocking self-approval: for a solo owner or small
// business, the owner IS the only person around to approve their own
// stock counts — requiring a second person would make the workflow
// unusable at exactly the scale most of your early users are at. What IS
// enforced is role: STAFF can create/propose an adjustment, but only
// OWNER/ADMIN/MANAGER can approve one. Revisit self-approval restrictions
// later if larger businesses request stricter segregation of duties.
const APPROVER_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
];

export async function listAdjustments(businessId: string) {
  return prisma.adjustment.findMany({
    where: { businessId },
    include: { warehouse: true, items: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdjustment(id: string) {
  return prisma.adjustment.findUniqueOrThrow({
    where: { id },
    include: {
      warehouse: true,
      createdBy: true,
      approvedBy: true,
      items: { include: { variant: { include: { unit: true } }, batch: true } },
    },
  });
}

async function nextAdjustmentNumber(businessId: string): Promise<string> {
  const count = await prisma.adjustment.count({ where: { businessId } });
  return `ADJ-${String(count + 1).padStart(4, "0")}`;
}

export async function createAdjustment(params: {
  businessId: string;
  warehouseId: string;
  type: AdjustmentType;
  createdById: string;
  reason?: string;
}) {
  const adjustmentNumber = await nextAdjustmentNumber(params.businessId);

  return prisma.adjustment.create({
    data: {
      businessId: params.businessId,
      warehouseId: params.warehouseId,
      type: params.type,
      createdById: params.createdById,
      reason: params.reason,
      adjustmentNumber,
      status: AdjustmentStatus.DRAFT,
    },
  });
}

export async function addAdjustmentItem(params: {
  adjustmentId: string;
  variantId: string;
  quantity: number;
  direction: AdjustmentDirection;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: Date;
  note?: string;
}) {
  const adjustment = await prisma.adjustment.findUniqueOrThrow({
    where: { id: params.adjustmentId },
  });
  if (adjustment.status !== AdjustmentStatus.DRAFT) {
    throw new AdjustmentNotDraftError(
      `Adjustment ${adjustment.adjustmentNumber} is no longer a draft.`,
    );
  }

  const variant = await prisma.productVariant.findUniqueOrThrow({
    where: { id: params.variantId },
  });
  if (variant.trackingMode === "BATCH") {
    const canCreateNewBatch =
      params.direction === AdjustmentDirection.IN && params.batchNumber;
    if (!params.batchId && !canCreateNewBatch) {
      throw new BatchRequiredForAdjustmentError(
        `${variant.name} is BATCH-tracked. OUT adjustments need an existing batch selected; ` +
          `IN adjustments need either an existing batch or a new batch number (for found stock).`,
      );
    }
  }

  return prisma.adjustmentItem.create({
    data: {
      adjustmentId: params.adjustmentId,
      variantId: params.variantId,
      quantity: params.quantity,
      direction: params.direction,
      batchId: params.batchId,
      batchNumber: params.batchNumber,
      expiryDate: params.expiryDate,
      note: params.note,
    },
  });
}

export async function removeAdjustmentItem(itemId: string) {
  const item = await prisma.adjustmentItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { adjustment: true },
  });
  if (item.adjustment.status !== AdjustmentStatus.DRAFT) {
    throw new AdjustmentNotDraftError(
      `Adjustment ${item.adjustment.adjustmentNumber} is no longer a draft.`,
    );
  }
  return prisma.adjustmentItem.delete({ where: { id: itemId } });
}

export async function cancelAdjustment(adjustmentId: string) {
  const adjustment = await prisma.adjustment.findUniqueOrThrow({
    where: { id: adjustmentId },
  });
  if (adjustment.status !== AdjustmentStatus.DRAFT) {
    throw new AdjustmentNotDraftError(
      `Adjustment ${adjustment.adjustmentNumber} is no longer a draft.`,
    );
  }
  return prisma.adjustment.update({
    where: { id: adjustmentId },
    data: { status: AdjustmentStatus.CANCELLED },
  });
}

/**
 * The whole point of this function: stock does NOT move when an
 * adjustment is created or when items are added — only here, on approval,
 * and only if the approver actually holds a role allowed to approve.
 * Everything before this point is just a proposal sitting in the DB.
 */
export async function approveAdjustment(
  adjustmentId: string,
  approvedById: string,
) {
  const events = new EventCollector();

  const result = await prisma.$transaction(
    async (tx) => {
      const adjustment = await tx.adjustment.findUniqueOrThrow({
        where: { id: adjustmentId },
        include: { items: { include: { variant: true } } },
      });

      if (adjustment.status !== AdjustmentStatus.DRAFT) {
        throw new AdjustmentNotDraftError(
          `Adjustment ${adjustment.adjustmentNumber} has already been ${adjustment.status.toLowerCase()}.`,
        );
      }
      if (adjustment.items.length === 0) {
        throw new Error(
          `Adjustment ${adjustment.adjustmentNumber} has no items.`,
        );
      }

      // Role check happens against a real Membership row, not anything the
      // caller supplied — same "never trust client input for authorization"
      // rule as businessId scoping.
      const membership = await tx.membership.findUnique({
        where: {
          userId_businessId: {
            userId: approvedById,
            businessId: adjustment.businessId,
          },
        },
      });
      if (!membership || !APPROVER_ROLES.includes(membership.role)) {
        throw new InsufficientPermissionError(
          "Only an OWNER, ADMIN, or MANAGER can approve an adjustment.",
        );
      }

      for (const item of adjustment.items) {
        let batchId = item.batchId ?? undefined;

        if (
          item.variant.trackingMode === "BATCH" &&
          !batchId &&
          item.batchNumber
        ) {
          const batch = await tx.productBatch.upsert({
            where: {
              warehouseId_variantId_batchNumber: {
                warehouseId: adjustment.warehouseId,
                variantId: item.variantId,
                batchNumber: item.batchNumber,
              },
            },
            update: {},
            create: {
              variantId: item.variantId,
              warehouseId: adjustment.warehouseId,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              quantity: 0,
            },
          });
          batchId = batch.id;
        }

        const movementType =
          item.direction === AdjustmentDirection.IN
            ? MovementType.ADJUSTMENT_IN
            : MovementType.ADJUSTMENT_OUT;

        await applyStockMovement({
          tx,
          businessId: adjustment.businessId,
          warehouseId: adjustment.warehouseId,
          variantId: item.variantId,
          quantity: item.quantity,
          type: movementType,
          referenceType: ReferenceType.ADJUSTMENT,
          referenceId: adjustment.id,
          batchId,
          performedById: approvedById,
          reason: adjustment.type,
          note: item.note,
          events,
        });
      }

      events.add({
        type: "adjustment.approved",
        businessId: adjustment.businessId,
        adjustmentId: adjustment.id,
        warehouseId: adjustment.warehouseId,
        adjustmentType: adjustment.type,
        occurredAt: new Date(),
      });

      return tx.adjustment.update({
        where: { id: adjustmentId },
        data: {
          status: AdjustmentStatus.APPROVED,
          approvedById,
          approvedAt: new Date(),
        },
      });
    },
    { timeout: 20_000, maxWait: 10_000 },
  );

  events.flush(eventBus);
  return result;
}
