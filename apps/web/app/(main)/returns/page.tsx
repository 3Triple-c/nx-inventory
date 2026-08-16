import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listReturns } from "@nx-inventory/inventory";
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

export default async function ReturnsPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const returns = await listReturns(business.businessId);

  return (
    <PageContainer>
      <PageHeader title="Returns" backHref="/" backLabel="Home" />

      <Link href="/returns/new">
        <Button>+ New return</Button>
      </Link>

      {returns.length === 0 && <EmptyState>No returns yet.</EmptyState>}

      <div className="space-y-3">
        {returns.map((r) => (
          <Link key={r.id} href={`/returns/${r.id}`}>
            <Card>
              <div className="flex justify-between">
                <span className="font-medium">{r.returnNumber}</span>
                <span className="text-sm text-gray-500">{r.status}</span>
              </div>
              <div className="text-sm text-gray-500">
                {r.direction === "CUSTOMER_RETURN"
                  ? `From sale ${r.sale?.saleNumber}`
                  : `To purchase ${r.purchase?.purchaseNumber}`}
                {" — "}
                {r.warehouse.name} — {r.items.length} item(s)
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
