import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import {
  getStockLevels,
  getLowStockItems,
  getExpiringBatches,
} from "@nx-inventory/inventory";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageContainer, PageHeader, Section, Card, EmptyState } from "@/components/ui";

export default async function StockPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const [levels, lowStock, expiring] = await Promise.all([
    getStockLevels(business.businessId),
    getLowStockItems(business.businessId),
    getExpiringBatches(business.businessId),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Stock"
        description="Monitor warehouse stock, low-stock alerts, and batches nearing expiry."
      />

      {lowStock.length > 0 && (
        <Section title={`Low stock (${lowStock.length})`}>
          <div className="space-y-2">
            {lowStock.map((s) => (
              <Card key={s.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {s.variant.product.name} - {s.variant.name}
                  </span>
                  <span className="rounded-md bg-destructive/10 px-2 py-1 text-sm font-medium text-destructive">
                    {Number(s.quantity)} {s.variant.unit.symbol}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {s.warehouse.name} - reorder at {Number(s.reorderLevel)}
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {expiring.length > 0 && (
        <Section title={`Expiring within 30 days (${expiring.length})`}>
          <div className="space-y-2">
            {expiring.map((b) => (
              <Card key={b.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {b.variant.product.name} - {b.variant.name} (batch {b.batchNumber})
                  </span>
                  <span className="rounded-md bg-amber-500/10 px-2 py-1 text-sm font-medium text-amber-700 dark:text-amber-300">
                    {new Date(b.expiryDate!).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {b.warehouse.name} - {Number(b.quantity)} {b.variant.unit.symbol} remaining
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Section title="All stock">
        {levels.length === 0 && <EmptyState>No stock recorded yet.</EmptyState>}
        <div className="space-y-2">
          {levels.map((s) => (
            <Card key={s.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span>
                  {s.variant.product.name} - {s.variant.name}
                </span>
                <span className="rounded-md bg-secondary px-2 py-1 text-sm font-medium text-secondary-foreground">
                  {Number(s.quantity)} {s.variant.unit.symbol}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">{s.warehouse.name}</div>
            </Card>
          ))}
        </div>
      </Section>
    </PageContainer>
  );
}
