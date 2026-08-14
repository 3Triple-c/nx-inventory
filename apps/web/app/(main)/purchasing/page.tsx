import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listPurchases } from "@nx-inventory/purchasing";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageContainer, PageHeader, Card, EmptyState, Button } from "@/components/ui";

export default async function PurchasingPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const purchases = await listPurchases(business.businessId);

  return (
    <PageContainer>
      <PageHeader
        title="Purchases"
        description="Create supplier orders, add received items, and post stock movements when goods arrive."
        actions={
          <>
            <Link href="/purchasing/new">
              <Button>New purchase</Button>
            </Link>
            <Link href="/purchasing/suppliers">
              <Button variant="secondary">Manage suppliers</Button>
            </Link>
          </>
        }
      />

      {purchases.length === 0 && <EmptyState>No purchases yet.</EmptyState>}

      <div className="space-y-3">
        {purchases.map((p) => (
          <Link key={p.id} href={`/purchasing/${p.id}`}>
            <Card className="space-y-2 transition-colors hover:border-primary/40 hover:bg-accent/40">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{p.purchaseNumber}</span>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                  {p.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {p.supplier.name} to {p.warehouse.name} - {p.items.length} item(s)
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
