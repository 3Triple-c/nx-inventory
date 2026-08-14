import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listProducts } from "@nx-inventory/catalog";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  PageContainer,
  PageHeader,
  Section,
  Card,
  EmptyState,
} from "@/components/ui";

export default async function CatalogPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const products = await listProducts(business.businessId);

  return (
    <PageContainer>
      <PageHeader title={`Catalog - ${business.businessName}`} backHref="/" backLabel="Home" />

      <Section title="Actions">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/catalog/products/new" className="text-muted-foreground hover:text-foreground">
            Add product
          </Link>
          <Link href="/catalog/setup" className="text-muted-foreground hover:text-foreground">
            Manage categories and units
          </Link>
          <Link href="/catalog/warehouses" className="text-muted-foreground hover:text-foreground">
            Warehouses
          </Link>
        </div>
      </Section>

      <Section title="Products">
        {products.length === 0 && <EmptyState>No products yet.</EmptyState>}
        <div className="space-y-3">
          {products.map((p) => (
            <Card key={p.id}>
              <div className="space-y-1">
                <Link href={`/catalog/products/${p.id}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
                <div className="text-sm text-muted-foreground">
                  {p.category ? p.category.name : "No category"}
                </div>
              </div>

              {p.variants.length === 0 && <EmptyState>No variants yet.</EmptyState>}
              {p.variants.length > 0 && (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {p.variants.map((v) => (
                    <li key={v.id}>
                      {v.name} - {v.unit.symbol} - tracking: {v.trackingMode}
                      {v.price ? ` - NGN ${v.price}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </Section>
    </PageContainer>
  );
}
