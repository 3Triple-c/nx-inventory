import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listSuppliers } from "@nx-inventory/suppliers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupplierAction } from "@/lib/suppliers";
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

export default async function SuppliersPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const suppliers = await listSuppliers(business.businessId);

  return (
    <PageContainer>
      <PageHeader
        title="Suppliers"
        description="Keep supplier contact details ready for purchasing workflows."
        backHref="/purchasing"
        backLabel="Purchases"
      />

      <Section title="Existing suppliers">
        {suppliers.length === 0 && <EmptyState>No suppliers yet - add one below.</EmptyState>}
        <div className="space-y-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="space-y-1">
              <div className="font-medium">{s.name}</div>
              {s.email && <div className="text-sm text-muted-foreground">{s.email}</div>}
              {s.phone && <div className="text-sm text-muted-foreground">{s.phone}</div>}
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Add supplier">
        <form action={createSupplierAction} className="space-y-3">
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Phone (optional)">
            <Input name="phone" />
          </Field>
          <Field label="Email (optional)">
            <Input name="email" type="email" />
          </Field>
          <Button type="submit">Add supplier</Button>
        </form>
      </Section>
    </PageContainer>
  );
}
