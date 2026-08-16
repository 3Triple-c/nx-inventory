import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listCustomers } from "@nx-inventory/customers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createCustomerAction } from "@/lib/customer";
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

export default async function CustomersPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const customers = await listCustomers(business.businessId);

  return (
    <PageContainer>
      <PageHeader title="Customers" backHref="/" backLabel="Home" />

      <Section title="Existing customers">
        {customers.length === 0 && (
          <EmptyState>No customers yet — add one below.</EmptyState>
        )}
        <div className="space-y-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`}>
              <Card>
                <div className="font-medium">{c.name}</div>
                {c.phone && (
                  <div className="text-sm text-gray-500">{c.phone}</div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Add customer">
        <form action={createCustomerAction} className="space-y-3">
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Phone (optional)">
            <Input name="phone" />
          </Field>
          <Field label="Email (optional)">
            <Input name="email" type="email" />
          </Field>
          <Button type="submit">Add customer</Button>
        </form>
      </Section>
    </PageContainer>
  );
}
