import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { getSale } from "@nx-inventory/sales";
import { listProducts } from "@nx-inventory/catalog";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  addSaleItemAction,
  removeSaleItemAction,
  completeSaleAction,
} from "@/lib/sales";
import {
  PageContainer,
  PageHeader,
  Section,
  Card,
  Field,
  Input,
  Select,
  Button,
  EmptyState,
} from "@/components/ui";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const [sale, products] = await Promise.all([
    getSale(id),
    listProducts(business.businessId),
  ]);

  const isDraft = sale.status === "DRAFT";
  const runningTotal = sale.items.reduce((sum, i) => sum + Number(i.total), 0);

  return (
    <PageContainer>
      <PageHeader title={sale.saleNumber} backHref="/sales" backLabel="Sales" />
      <p className="text-sm text-gray-500">
        Status: <strong>{sale.status}</strong> — {sale.warehouse.name} —{" "}
        {sale.customer ? sale.customer.name : "Walk-in (no customer)"}
        {sale.status === "COMPLETED" && ` — Paid via ${sale.paymentMethod}`}
      </p>

      <Section title="Items">
        {sale.items.length === 0 && (
          <EmptyState>No items yet — add one below.</EmptyState>
        )}
        <div className="space-y-2">
          {sale.items.map((item) => (
            <Card key={item.id}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{item.variant.name}</div>
                  <div className="text-sm text-gray-500">
                    {Number(item.quantity)} {item.variant.unit.symbol} @ ₦
                    {Number(item.unitPrice)}
                    {Number(item.discount) > 0 &&
                      ` − ₦${Number(item.discount)} discount`}{" "}
                    = ₦{Number(item.total)}
                  </div>
                </div>
                {isDraft && (
                  <form action={removeSaleItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="saleId" value={sale.id} />
                    <Button type="submit" variant="secondary">
                      Remove
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
        <p className="text-sm font-medium">Running total: ₦{runningTotal}</p>
      </Section>

      {isDraft && (
        <Section title="Add item">
          <form action={addSaleItemAction} className="space-y-3">
            <input type="hidden" name="saleId" value={sale.id} />
            <Field label="Product / variant">
              <Select name="variantId" required defaultValue="">
                <option value="" disabled>
                  Select variant
                </option>
                {products.flatMap((p) =>
                  p.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {p.name} — {v.name} ({v.unit.symbol})
                      {v.price ? ` — ₦${Number(v.price)}` : ""}
                    </option>
                  )),
                )}
              </Select>
            </Field>
            <Field label="Quantity">
              <Input name="quantity" type="number" step="0.01" required />
            </Field>
            <Field label="Unit price">
              <Input name="unitPrice" type="number" step="0.01" required />
            </Field>
            <Field label="Discount (optional)">
              <Input
                name="discount"
                type="number"
                step="0.01"
                defaultValue="0"
              />
            </Field>
            <Button type="submit">Add item</Button>
          </form>
        </Section>
      )}

      {isDraft && sale.items.length > 0 && (
        <Section title="Complete sale">
          <form action={completeSaleAction} className="space-y-3">
            <input type="hidden" name="saleId" value={sale.id} />
            <Field label="Payment method">
              <Select name="paymentMethod" defaultValue="CASH">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="TRANSFER">Transfer</option>
                <option value="POS">POS</option>
                <option value="MOBILE_MONEY">Mobile money</option>
                <option value="CREDIT">Credit</option>
              </Select>
            </Field>
            <Button type="submit">Complete sale (updates stock)</Button>
          </form>
        </Section>
      )}
    </PageContainer>
  );
}
