import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageContainer, PageHeader, Section, Card } from "@/components/ui";
import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "Catalog",
    href: "/catalog",
    description: "Products, variants, categories, units, and warehouses.",
  },
  {
    title: "Purchasing",
    href: "/purchasing",
    description: "Create supplier purchases and receive stock into inventory.",
  },
  {
    title: "Sales",
    href: "/sales",
    description: "Draft and complete sales while stock movements stay traceable.",
  },
  {
    title: "Stock",
    href: "/stock",
    description: "Review stock levels, low-stock items, and expiring batches.",
  },
];

export default async function Home() {
  const session = await getSession(await headers());

  if (!session) {
    redirect("/login");
  }

  const business = await getUserBusinessContext(session.user.id);
  if (!business) {
    redirect("/onboarding");
  }

  return (
    <PageContainer>
      <PageHeader
        title={business.businessName}
        description={`Signed in as ${session.user.name || session.user.email}. Your role is ${business.role}.`}
        actions={
          <Button asChild>
            <Link href="/catalog/products/new">Add product</Link>
          </Button>
        }
      />

      <Section title="Workspace">
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <Link key={module.href} href={module.href}>
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/50">
                <div className="space-y-2">
                  <div className="text-lg font-semibold">{module.title}</div>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
    </PageContainer>
  );
}
