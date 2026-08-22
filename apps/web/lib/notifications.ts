"use server";

import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { markAsRead, markAllAsRead } from "@nx-inventory/notifications";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function markNotificationReadAction(formData: FormData) {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const id = String(formData.get("id") ?? "");
  await markAsRead(id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  await markAllAsRead(business.businessId);
  revalidatePath("/notifications");
}
