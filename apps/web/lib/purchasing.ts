"use server";

import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import {
  createPurchase,
  addPurchaseItem,
  removePurchaseItem,
  receivePurchase,
} from "@nx-inventory/purchasing";
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

export async function createPurchaseAction(formData: FormData) {
  const { session, business } = await requireBusinessAndSession();

  const supplierId = String(formData.get("supplierId") ?? "");
  const warehouseId = String(formData.get("warehouseId") ?? "");
  if (!supplierId || !warehouseId)
    throw new Error("Supplier and warehouse are required");

  const purchase = await createPurchase({
    businessId: business.businessId,
    supplierId,
    warehouseId,
    createdById: session.user.id,
  });

  redirect(`/purchasing/${purchase.id}`);
}

export async function addPurchaseItemAction(formData: FormData) {
  await requireBusinessAndSession();

  const purchaseId = String(formData.get("purchaseId") ?? "");
  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const unitCost = Number(formData.get("unitCost") ?? 0);
  const batchNumber =
    String(formData.get("batchNumber") ?? "").trim() || undefined;
  const expiryRaw = String(formData.get("expiryDate") ?? "").trim();

  if (!purchaseId || !variantId || quantity <= 0 || unitCost < 0) {
    throw new Error(
      "Variant, a positive quantity, and a unit cost are required",
    );
  }

  await addPurchaseItem({
    purchaseId,
    variantId,
    quantity,
    unitCost,
    batchNumber,
    expiryDate: expiryRaw ? new Date(expiryRaw) : undefined,
  });
  revalidatePath(`/purchasing/${purchaseId}`);
}

export async function removePurchaseItemAction(formData: FormData) {
  await requireBusinessAndSession();
  const itemId = String(formData.get("itemId") ?? "");
  const purchaseId = String(formData.get("purchaseId") ?? "");
  await removePurchaseItem(itemId);
  revalidatePath(`/purchasing/${purchaseId}`);
}

export async function receivePurchaseAction(formData: FormData) {
  const { session } = await requireBusinessAndSession();
  const purchaseId = String(formData.get("purchaseId") ?? "");
  await receivePurchase(purchaseId, session.user.id);
  const result = await receivePurchase(purchaseId, session.user.id);
  await processEvents(result.events);
  revalidatePath(`/purchasing/${purchaseId}`);
}
