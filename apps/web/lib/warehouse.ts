"use server";

import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { createWarehouse } from "@nx-inventory/warehouses";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createWarehouseAction(formData: FormData) {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || undefined;
  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  if (!name) throw new Error("Warehouse name is required");

  await createWarehouse({
    businessId: business.businessId,
    name,
    address,
    phone,
  });
  revalidatePath("/warehouses");
}
