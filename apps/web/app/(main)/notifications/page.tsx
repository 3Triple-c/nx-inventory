import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listNotifications } from "@nx-inventory/notifications";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/notifications";
import {
  PageContainer,
  PageHeader,
  Card,
  Button,
  EmptyState,
} from "@/components/ui";

export default async function NotificationsPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const notifications = await listNotifications(business.businessId);

  return (
    <PageContainer>
      <PageHeader title="Notifications" backHref="/" backLabel="Home" />

      {notifications.some((n) => !n.read) && (
        <form action={markAllNotificationsReadAction}>
          <Button variant="secondary" type="submit">
            Mark all as read
          </Button>
        </form>
      )}

      {notifications.length === 0 && <EmptyState>Nothing here yet.</EmptyState>}

      <div className="space-y-2">
        {notifications.map((n) => (
          <Card key={n.id}>
            <div className="flex justify-between items-start gap-3">
              <div>
                <div className={n.read ? "text-gray-500" : "font-medium"}>
                  {n.message}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString()}
                  {n.link && (
                    <>
                      {" — "}
                      <Link href={n.link} className="underline">
                        View
                      </Link>
                    </>
                  )}
                </div>
              </div>
              {!n.read && (
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="id" value={n.id} />
                  <Button variant="secondary" type="submit">
                    Mark read
                  </Button>
                </form>
              )}
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
