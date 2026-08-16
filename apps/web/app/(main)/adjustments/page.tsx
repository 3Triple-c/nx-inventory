import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listAdjustments } from "@nx-inventory/inventory";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  PageContainer,
  PageHeader,
  Card,
  EmptyState,
  Button,
} from "@/components/ui";

export default async function AdjustmentsPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const adjustments = await listAdjustments(business.businessId);

  return (
    <PageContainer>
      <PageHeader title="Adjustments" backHref="/" backLabel="Home" />

      <Link href="/adjustments/new">
        <Button>+ New adjustment</Button>
      </Link>

      {adjustments.length === 0 && <EmptyState>No adjustments yet.</EmptyState>}

      <div className="space-y-3">
        {adjustments.map((a) => (
          <Link key={a.id} href={`/adjustments/${a.id}`}>
            <Card>
              <div className="flex justify-between">
                <span className="font-medium">{a.adjustmentNumber}</span>
                <span className="text-sm text-gray-500">{a.status}</span>
              </div>
              <div className="text-sm text-gray-500">
                {a.type} — {a.warehouse.name} — {a.items.length} item(s) — by{" "}
                {a.createdBy.name}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
