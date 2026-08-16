import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { getSupplier } from "@nx-inventory/suppliers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { updateSupplierAction } from "@/lib/suppliers";
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

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const supplier = await getSupplier(id);

  return (
    <PageContainer>
      <PageHeader
        title={supplier.name}
        backHref="/purchasing/suppliers"
        backLabel="Suppliers"
      />

      <Section title="Details">
        <form action={updateSupplierAction} className="space-y-3">
          <input type="hidden" name="id" value={supplier.id} />
          <Field label="Name">
            <Input name="name" defaultValue={supplier.name} required />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={supplier.phone ?? ""} />
          </Field>
          <Field label="Email">
            <Input
              name="email"
              type="email"
              defaultValue={supplier.email ?? ""}
            />
          </Field>
          <Field label="Address">
            <Input name="address" defaultValue={supplier.address ?? ""} />
          </Field>
          <Button type="submit">Save changes</Button>
        </form>
      </Section>

      <Section title="Purchase history">
        {supplier.purchases.length === 0 && (
          <EmptyState>No purchases from this supplier yet.</EmptyState>
        )}
        <div className="space-y-2">
          {supplier.purchases.map((p) => (
            <Link key={p.id} href={`/purchasing/${p.id}`}>
              <Card>
                <div className="flex justify-between">
                  <span className="font-medium">{p.purchaseNumber}</span>
                  <span className="text-sm text-gray-500">{p.status}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {p.warehouse.name} — {p.items.length} item(s)
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
    </PageContainer>
  );
}
