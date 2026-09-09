"use server";

import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import {
  createReturn,
  addReturnItem,
  removeReturnItem,
  completeReturn,
} from "@nx-inventory/inventory";
import { prisma, ReturnDirection } from "@nx-inventory/database";
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

export async function createCustomerReturnAction(formData: FormData) {
  const { session, business } = await requireBusinessAndSession();

  const saleId = String(formData.get("saleId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  if (!saleId) throw new Error("A sale is required");

  // Warehouse defaults to the original sale's warehouse — returning stock
  // anywhere else would need a manual Transfer afterward, not a Return.
  const sale = await prisma.sale.findUniqueOrThrow({ where: { id: saleId } });

  const ret = await createReturn({
    businessId: business.businessId,
    warehouseId: sale.warehouseId,
    direction: ReturnDirection.CUSTOMER_RETURN,
    saleId,
    createdById: session.user.id,
    reason,
  });

  redirect(`/returns/${ret.id}`);
}

export async function createSupplierReturnAction(formData: FormData) {
  const { session, business } = await requireBusinessAndSession();

  const purchaseId = String(formData.get("purchaseId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  if (!purchaseId) throw new Error("A purchase is required");

  const purchase = await prisma.purchase.findUniqueOrThrow({
    where: { id: purchaseId },
  });

  const ret = await createReturn({
    businessId: business.businessId,
    warehouseId: purchase.warehouseId,
    direction: ReturnDirection.SUPPLIER_RETURN,
    purchaseId,
    createdById: session.user.id,
    reason,
  });

  redirect(`/returns/${ret.id}`);
}

export async function addReturnItemAction(formData: FormData) {
  await requireBusinessAndSession();

  const returnId = String(formData.get("returnId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const unitPriceRaw = formData.get("unitPrice");
  const note = String(formData.get("note") ?? "").trim() || undefined;

  let variantId = String(formData.get("variantId") ?? "");
  let batchId: string | undefined;
  const batchSelection = String(formData.get("batchSelection") ?? "");
  if (batchSelection) {
    const [parsedBatchId, parsedVariantId] = batchSelection.split("::");
    batchId = parsedBatchId;
    variantId = parsedVariantId;
  }

  if (!returnId || !variantId || quantity <= 0) {
    throw new Error("Variant and a positive quantity are required");
  }

  await addReturnItem({
    returnId,
    variantId,
    quantity,
    batchId,
    unitPrice: unitPriceRaw ? Number(unitPriceRaw) : undefined,
    note,
  });
  revalidatePath(`/returns/${returnId}`);
}

export async function removeReturnItemAction(formData: FormData) {
  await requireBusinessAndSession();
  const itemId = String(formData.get("itemId") ?? "");
  const returnId = String(formData.get("returnId") ?? "");
  await removeReturnItem(itemId);
  revalidatePath(`/returns/${returnId}`);
}

export async function completeReturnAction(formData: FormData) {
  const { session } = await requireBusinessAndSession();
  const returnId = String(formData.get("returnId") ?? "");
  await completeReturn(returnId, session.user.id);
  const result = await completeReturn(returnId, session.user.id);
  await processEvents(result.events);
  revalidatePath(`/returns/${returnId}`);
}
