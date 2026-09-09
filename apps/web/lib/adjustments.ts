"use server";

import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import {
  createAdjustment,
  addAdjustmentItem,
  removeAdjustmentItem,
  approveAdjustment,
  cancelAdjustment,
} from "@nx-inventory/inventory";
import { AdjustmentType, AdjustmentDirection } from "@nx-inventory/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { processEvents } from "@nx-inventory/notifications";

async function requireBusinessAndSession() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  return { session, business };
}

export async function createAdjustmentAction(formData: FormData) {
  const { session, business } = await requireBusinessAndSession();

  const warehouseId = String(formData.get("warehouseId") ?? "");
  const type = String(formData.get("type") ?? "") as AdjustmentType;
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  if (!warehouseId || !type) throw new Error("Warehouse and type are required");

  const adjustment = await createAdjustment({
    businessId: business.businessId,
    warehouseId,
    type,
    createdById: session.user.id,
    reason,
  });

  redirect(`/adjustments/${adjustment.id}`);
}

export async function addAdjustmentItemAction(formData: FormData) {
  await requireBusinessAndSession();

  const adjustmentId = String(formData.get("adjustmentId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const direction = String(
    formData.get("direction") ?? "",
  ) as AdjustmentDirection;
  const note = String(formData.get("note") ?? "").trim() || undefined;

  let variantId = String(formData.get("variantId") ?? "");
  let batchId: string | undefined;
  const batchSelection = String(formData.get("batchSelection") ?? "");
  if (batchSelection) {
    const [parsedBatchId, parsedVariantId] = batchSelection.split("::");
    batchId = parsedBatchId;
    variantId = parsedVariantId;
  }

  const batchNumber =
    String(formData.get("batchNumber") ?? "").trim() || undefined;
  const expiryRaw = String(formData.get("expiryDate") ?? "").trim();

  if (!adjustmentId || !variantId || quantity <= 0 || !direction) {
    throw new Error("Variant, direction, and a positive quantity are required");
  }

  await addAdjustmentItem({
    adjustmentId,
    variantId,
    quantity,
    direction,
    batchId,
    batchNumber,
    expiryDate: expiryRaw ? new Date(expiryRaw) : undefined,
    note,
  });
  revalidatePath(`/adjustments/${adjustmentId}`);
}

export async function removeAdjustmentItemAction(formData: FormData) {
  await requireBusinessAndSession();
  const itemId = String(formData.get("itemId") ?? "");
  const adjustmentId = String(formData.get("adjustmentId") ?? "");
  await removeAdjustmentItem(itemId);
  revalidatePath(`/adjustments/${adjustmentId}`);
}

export async function approveAdjustmentAction(formData: FormData) {
  const { session } = await requireBusinessAndSession();
  const adjustmentId = String(formData.get("adjustmentId") ?? "");
  // approveAdjustment re-checks the role itself against a real Membership
  // row — this call can't be trusted into approving just because the
  // button was visible; the service is the actual gate.
  await approveAdjustment(adjustmentId, session.user.id);
  const result = await approveAdjustment(adjustmentId, session.user.id);
  await processEvents(result.events);
  revalidatePath(`/adjustments/${adjustmentId}`);
}

export async function cancelAdjustmentAction(formData: FormData) {
  await requireBusinessAndSession();
  const adjustmentId = String(formData.get("adjustmentId") ?? "");
  await cancelAdjustment(adjustmentId);
  revalidatePath(`/adjustments/${adjustmentId}`);
}
