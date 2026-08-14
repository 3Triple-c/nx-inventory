import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listSales } from "@nx-inventory/sales";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageContainer, PageHeader, Card, EmptyState, Button } from "@/components/ui";

export default async function SalesPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const sales = await listSales(business.businessId);

  return (
    <PageContainer>
      <PageHeader
        title="Sales"
        description="Start draft sales, add line items, and complete transactions against live stock."
        actions={
          <Link href="/sales/new">
            <Button>New sale</Button>
          </Link>
        }
      />

      {sales.length === 0 && <EmptyState>No sales yet.</EmptyState>}

      <div className="space-y-3">
        {sales.map((s) => (
          <Link key={s.id} href={`/sales/${s.id}`}>
            <Card className="space-y-2 transition-colors hover:border-primary/40 hover:bg-accent/40">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{s.saleNumber}</span>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                  {s.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {s.warehouse.name} - {s.items.length} item(s)
                {s.status === "COMPLETED" && ` - NGN ${Number(s.total)}`}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
