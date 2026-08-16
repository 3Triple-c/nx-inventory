import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listWarehouses } from "@nx-inventory/warehouses";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdjustmentAction } from "@/lib/adjustments";
import {
  PageContainer,
  PageHeader,
  Field,
  Select,
  Input,
  Button,
  EmptyState,
} from "@/components/ui";
import Link from "next/link";

export default async function NewAdjustmentPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const warehouses = await listWarehouses(business.businessId);

  if (warehouses.length === 0) {
    return (
      <PageContainer>
        <PageHeader
          title="New adjustment"
          backHref="/adjustments"
          backLabel="Adjustments"
        />
        <EmptyState>
          You need a warehouse first —{" "}
          <Link href="/warehouses" className="underline">
            add one
          </Link>
          .
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="New adjustment"
        backHref="/adjustments"
        backLabel="Adjustments"
      />
      <form action={createAdjustmentAction} className="space-y-3">
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
        <Field label="Type">
          <Select name="type" required defaultValue="">
            <option value="" disabled>
              Select type
            </option>
            <option value="STOCK_COUNT">Stock count correction</option>
            <option value="DAMAGE">Damage</option>
            <option value="EXPIRED">Expired</option>
            <option value="LOST">Lost</option>
            <option value="FOUND">Found</option>
            <option value="INTERNAL_USE">Internal use</option>
            <option value="DONATION">Donation</option>
            <option value="SAMPLE">Sample</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Reason (optional)">
          <Input name="reason" />
        </Field>
        <Button type="submit">Create adjustment (draft)</Button>
      </form>
    </PageContainer>
  );
}
