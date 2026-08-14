import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listCategories, listUnits } from "@nx-inventory/catalog";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createCategoryAction, createUnitAction } from "@/lib/catalog";
import {
  PageContainer,
  PageHeader,
  Section,
  Card,
  Field,
  Input,
  Button,
  EmptyState,
} from "@/components/ui";

export default async function CatalogSetupPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const [categories, units] = await Promise.all([
    listCategories(business.businessId),
    listUnits(business.businessId),
  ]);

  return (
    <PageContainer>
      <PageHeader title="Categories and units" backHref="/catalog" backLabel="Products" />

      <Section title="Categories">
        {categories.length === 0 && <EmptyState>No categories yet.</EmptyState>}
        <div className="space-y-3">
          {categories.map((c) => (
            <Card key={c.id}>
              <div className="font-medium">{c.name}</div>
            </Card>
          ))}
        </div>
        <form action={createCategoryAction} className="space-y-3">
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Button type="submit">Add category</Button>
        </form>
      </Section>

      <Section title="Units">
        {units.length === 0 && <EmptyState>No units yet.</EmptyState>}
        <div className="space-y-3">
          {units.map((u) => (
            <Card key={u.id}>
              <div className="font-medium">
                {u.name} ({u.symbol})
              </div>
              {!u.businessId && <div className="text-sm text-muted-foreground">Shared</div>}
            </Card>
          ))}
        </div>
        <form action={createUnitAction} className="space-y-3">
          <Field label="Name">
            <Input name="name" placeholder="Tablet" required />
          </Field>
          <Field label="Symbol">
            <Input name="symbol" placeholder="tab" required />
          </Field>
          <Button type="submit">Add unit</Button>
        </form>
      </Section>
    </PageContainer>
  );
}
