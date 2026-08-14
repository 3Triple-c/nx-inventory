import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listSuppliers } from "@nx-inventory/suppliers";
import { listWarehouses } from "@nx-inventory/warehouses";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createPurchaseAction } from "@/lib/purchasing";
import { PageContainer, PageHeader, Field, Select, Button, EmptyState } from "@/components/ui";

export default async function NewPurchasePage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const [suppliers, warehouses] = await Promise.all([
    listSuppliers(business.businessId),
    listWarehouses(business.businessId),
  ]);

  if (suppliers.length === 0 || warehouses.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="New purchase" backHref="/purchasing" backLabel="Purchases" />
        <EmptyState>
          You need at least one supplier and one warehouse first.{" "}
          <Link href="/purchasing/suppliers" className="underline">
            Add a supplier
          </Link>{" "}
          or{" "}
          <Link href="/catalog/warehouses" className="underline">
            add a warehouse
          </Link>
          .
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="New purchase"
        description="Choose where the purchase is coming from and where stock will be received."
        backHref="/purchasing"
        backLabel="Purchases"
      />
      <form action={createPurchaseAction} className="space-y-3">
        <Field label="Supplier">
          <Select name="supplierId" required defaultValue="">
            <option value="" disabled>
              Select supplier
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Receiving warehouse">
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
        <Button type="submit">Create purchase</Button>
      </form>
    </PageContainer>
  );
}
