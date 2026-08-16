"use server";

import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { createCustomer, updateCustomer } from "@nx-inventory/customers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createCustomerAction(formData: FormData) {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const email = String(formData.get("email") ?? "").trim() || undefined;
  if (!name) throw new Error("Customer name is required");

  await createCustomer({ businessId: business.businessId, name, phone, email });
  revalidatePath("/customers");
}

export async function updateCustomerAction(formData: FormData) {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!id || !name) throw new Error("Customer name is required");

  await updateCustomer(id, { name, phone, email, address });
  revalidatePath(`/customers/${id}`);
}
