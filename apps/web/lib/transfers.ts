"use server";

import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import {
  createTransfer,
  addTransferItem,
  removeTransferItem,
  completeTransfer,
} from "@nx-inventory/inventory";
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

export async function createTransferAction(formData: FormData) {
  const { session, business } = await requireBusinessAndSession();

  const fromWarehouseId = String(formData.get("fromWarehouseId") ?? "");
  const toWarehouseId = String(formData.get("toWarehouseId") ?? "");
  if (!fromWarehouseId || !toWarehouseId) {
    throw new Error("Source and destination warehouse are required");
  }

  const transfer = await createTransfer({
    businessId: business.businessId,
    fromWarehouseId,
    toWarehouseId,
    createdById: session.user.id,
  });

  redirect(`/transfers/${transfer.id}`);
}

export async function addTransferItemAction(formData: FormData) {
  await requireBusinessAndSession();

  const transferId = String(formData.get("transferId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);

  // Two possible sources of variantId: a plain variant select (NONE-tracked
  // items) or a composite "batchId::variantId" value from the batch picker
  // (BATCH-tracked items) — a batch belongs to exactly one variant, so
  // picking the batch also picks the variant, without a dependent dropdown.
  let variantId = String(formData.get("variantId") ?? "");
  let batchId: string | undefined;

  const batchSelection = String(formData.get("batchSelection") ?? "");
  if (batchSelection) {
    const [parsedBatchId, parsedVariantId] = batchSelection.split("::");
    batchId = parsedBatchId;
    variantId = parsedVariantId;
  }

  if (!transferId || !variantId || quantity <= 0) {
    throw new Error("Variant and a positive quantity are required");
  }

  await addTransferItem({ transferId, variantId, quantity, batchId });
  revalidatePath(`/transfers/${transferId}`);
}

export async function removeTransferItemAction(formData: FormData) {
  await requireBusinessAndSession();
  const itemId = String(formData.get("itemId") ?? "");
  const transferId = String(formData.get("transferId") ?? "");
  await removeTransferItem(itemId);
  revalidatePath(`/transfers/${transferId}`);
}

export async function completeTransferAction(formData: FormData) {
  const { session } = await requireBusinessAndSession();
  const transferId = String(formData.get("transferId") ?? "");
  // await completeTransfer(transferId, session.user.id);
  const result = await completeTransfer(transferId, session.user.id);
  await processEvents(result.events);
  revalidatePath(`/transfers/${transferId}`);
}
