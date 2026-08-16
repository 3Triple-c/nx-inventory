import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listSales } from "@nx-inventory/sales";
import { listPurchases } from "@nx-inventory/purchasing";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createCustomerReturnAction,
  createSupplierReturnAction,
} from "@/lib/returns";
import {
  PageContainer,
  PageHeader,
  Section,
  Field,
  Select,
  Input,
  Button,
  EmptyState,
} from "@/components/ui";

export default async function NewReturnPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const [sales, purchases] = await Promise.all([
    listSales(business.businessId),
    listPurchases(business.businessId),
  ]);

  const completedSales = sales.filter((s) => s.status === "COMPLETED");
  const completedPurchases = purchases.filter((p) => p.status === "COMPLETED");

  return (
    <PageContainer>
      <PageHeader title="New return" backHref="/returns" backLabel="Returns" />

      <Section title="Customer return (goods coming back to us)">
        {completedSales.length === 0 && (
          <EmptyState>No completed sales to return against yet.</EmptyState>
        )}
        {completedSales.length > 0 && (
          <form action={createCustomerReturnAction} className="space-y-3">
            <Field label="Original sale">
              <Select name="saleId" required defaultValue="">
                <option value="" disabled>
                  Select sale
                </option>
                {completedSales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.saleNumber} — {s.warehouse.name} — ₦{Number(s.total)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reason (optional)">
              <Input name="reason" />
            </Field>
            <Button type="submit">Start customer return</Button>
          </form>
        )}
      </Section>

      <Section title="Supplier return (goods going back to a supplier)">
        {completedPurchases.length === 0 && (
          <EmptyState>No completed purchases to return against yet.</EmptyState>
        )}
        {completedPurchases.length > 0 && (
          <form action={createSupplierReturnAction} className="space-y-3">
            <Field label="Original purchase">
              <Select name="purchaseId" required defaultValue="">
                <option value="" disabled>
                  Select purchase
                </option>
                {completedPurchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.purchaseNumber} — {p.supplier.name} — {p.warehouse.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reason (optional)">
              <Input name="reason" />
            </Field>
            <Button type="submit">Start supplier return</Button>
          </form>
        )}
      </Section>
    </PageContainer>
  );
}
