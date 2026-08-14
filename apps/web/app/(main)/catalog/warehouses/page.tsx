import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listWarehouses } from "@nx-inventory/warehouses";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createWarehouseAction } from "@/lib/warehouse";
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

export default async function WarehousesPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const warehouses = await listWarehouses(business.businessId);

  return (
    <PageContainer>
      <PageHeader
        title="Warehouses"
        description="Manage the physical locations where stock is received, stored, and sold from."
      />

      <Section title="Existing warehouses">
        {warehouses.length === 0 && <EmptyState>No warehouses yet - add one below.</EmptyState>}
        <div className="space-y-3">
          {warehouses.map((w) => (
            <Card key={w.id} className="space-y-1">
              <div className="font-medium">{w.name}</div>
              {w.address && <div className="text-sm text-muted-foreground">{w.address}</div>}
              {w.phone && <div className="text-sm text-muted-foreground">{w.phone}</div>}
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Add warehouse">
        <form action={createWarehouseAction} className="space-y-3">
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Address (optional)">
            <Input name="address" />
          </Field>
          <Field label="Phone (optional)">
            <Input name="phone" />
          </Field>
          <Button type="submit">Add warehouse</Button>
        </form>
      </Section>
    </PageContainer>
  );
}
