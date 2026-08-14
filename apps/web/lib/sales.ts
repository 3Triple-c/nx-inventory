"use server";

import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import {
  createSale,
  addSaleItem,
  removeSaleItem,
  completeSale,
} from "@nx-inventory/sales";
import { PaymentMethod } from "@nx-inventory/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireBusinessAndSession() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  return { session, business };
}

export async function createSaleAction(formData: FormData) {
  const { session, business } = await requireBusinessAndSession();

  const warehouseId = String(formData.get("warehouseId") ?? "");
  if (!warehouseId) throw new Error("Warehouse is required");

  const sale = await createSale({
    businessId: business.businessId,
    warehouseId,
    createdById: session.user.id,
  });

  redirect(`/sales/${sale.id}`);
}

export async function addSaleItemAction(formData: FormData) {
  await requireBusinessAndSession();

  const saleId = String(formData.get("saleId") ?? "");
  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const unitPrice = Number(formData.get("unitPrice") ?? 0);
  const discount = Number(formData.get("discount") ?? 0);

  if (!saleId || !variantId || quantity <= 0 || unitPrice < 0) {
    throw new Error(
      "Variant, a positive quantity, and a unit price are required",
    );
  }

  await addSaleItem({ saleId, variantId, quantity, unitPrice, discount });
  revalidatePath(`/sales/${saleId}`);
}

export async function removeSaleItemAction(formData: FormData) {
  await requireBusinessAndSession();
  const itemId = String(formData.get("itemId") ?? "");
  const saleId = String(formData.get("saleId") ?? "");
  await removeSaleItem(itemId);
  revalidatePath(`/sales/${saleId}`);
}

export async function completeSaleAction(formData: FormData) {
  const { session } = await requireBusinessAndSession();
  const saleId = String(formData.get("saleId") ?? "");
  const paymentMethod = String(
    formData.get("paymentMethod") ?? "CASH",
  ) as PaymentMethod;

  await completeSale({ saleId, performedById: session.user.id, paymentMethod });
  revalidatePath(`/sales/${saleId}`);
}
