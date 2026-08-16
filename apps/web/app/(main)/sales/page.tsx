import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listSales } from "@nx-inventory/sales";
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

export default async function SalesPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const sales = await listSales(business.businessId);

  return (
    <PageContainer>
      <PageHeader title="Sales" backHref="/" backLabel="Home" />

      <Link href="/sales/new">
        <Button>+ New sale</Button>
      </Link>

      {sales.length === 0 && <EmptyState>No sales yet.</EmptyState>}

      <div className="space-y-3">
        {sales.map((s) => (
          <Link key={s.id} href={`/sales/${s.id}`}>
            <Card>
              <div className="flex justify-between">
                <span className="font-medium">{s.saleNumber}</span>
                <span className="text-sm text-gray-500">{s.status}</span>
              </div>
              <div className="text-sm text-gray-500">
                {s.warehouse.name} — {s.customer ? s.customer.name : "Walk-in"}{" "}
                — {s.items.length} item(s)
                {s.status === "COMPLETED" && ` — ₦${Number(s.total)}`}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
