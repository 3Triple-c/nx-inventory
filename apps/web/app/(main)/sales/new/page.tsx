import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listWarehouses } from "@nx-inventory/warehouses";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSaleAction } from "@/lib/sales";
import { PageContainer, PageHeader, Field, Select, Button, EmptyState } from "@/components/ui";

export default async function NewSalePage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const warehouses = await listWarehouses(business.businessId);

  if (warehouses.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="New sale" backHref="/sales" backLabel="Sales" />
        <EmptyState>
          You need a warehouse first.{" "}
          <Link href="/catalog/warehouses" className="underline">
            Add one
          </Link>
          .
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="New sale"
        description="Pick the warehouse this sale should draw stock from."
        backHref="/sales"
        backLabel="Sales"
      />
      <form action={createSaleAction} className="space-y-3">
        <Field label="Warehouse">
          <Select name="warehouseId" required defaultValue="">
            <option value="" disabled>
              Select warehouse
            </option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit">Start sale</Button>
      </form>
    </PageContainer>
  );
}
