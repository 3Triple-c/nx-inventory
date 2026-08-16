"use server";

import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import {
  createSale,
  addSaleItem,
  removeSaleItem,
  completeSale,
} from "@nx-inventory/sales";
import { prisma, PaymentMethod } from "@nx-inventory/database";
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
  const customerId =
    String(formData.get("customerId") ?? "").trim() || undefined;
  if (!warehouseId) throw new Error("Warehouse is required");

  // Never trust a client-submitted ID at face value — confirm this
  // customer actually belongs to the current business before attaching a
  // sale to it. Without this, a tampered form could attribute a sale to
  // another business's customer: exactly the cross-tenant leak the
  // businessId-scoping rule exists to prevent.
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: business.businessId },
      select: { id: true },
    });
    if (!customer) {
      throw new Error("Selected customer does not belong to this business.");
    }
  }

  const sale = await createSale({
    businessId: business.businessId,
    warehouseId,
    customerId,
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
