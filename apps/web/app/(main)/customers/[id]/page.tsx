import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { getCustomer } from "@nx-inventory/customers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { updateCustomerAction } from "@/lib/customer";
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

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const customer = await getCustomer(id);
  const completedSales = customer.sales.filter((s) => s.status === "COMPLETED");
  const totalSpent = completedSales.reduce(
    (sum, s) => sum + Number(s.total),
    0,
  );

  return (
    <PageContainer>
      <PageHeader
        title={customer.name}
        backHref="/customers"
        backLabel="Customers"
      />

      <Section title="Details">
        <form action={updateCustomerAction} className="space-y-3">
          <input type="hidden" name="id" value={customer.id} />
          <Field label="Name">
            <Input name="name" defaultValue={customer.name} required />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={customer.phone ?? ""} />
          </Field>
          <Field label="Email">
            <Input
              name="email"
              type="email"
              defaultValue={customer.email ?? ""}
            />
          </Field>
          <Field label="Address">
            <Input name="address" defaultValue={customer.address ?? ""} />
          </Field>
          <Button type="submit">Save changes</Button>
        </form>
      </Section>

      <Section title={`Sales history — total spent ₦${totalSpent}`}>
        {customer.sales.length === 0 && (
          <EmptyState>No sales for this customer yet.</EmptyState>
        )}
        <div className="space-y-2">
          {customer.sales.map((s) => (
            <Link key={s.id} href={`/sales/${s.id}`}>
              <Card>
                <div className="flex justify-between">
                  <span className="font-medium">{s.saleNumber}</span>
                  <span className="text-sm text-gray-500">{s.status}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {s.warehouse.name} — {s.items.length} item(s)
                  {s.status === "COMPLETED" && ` — ₦${Number(s.total)}`}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
    </PageContainer>
  );
}
