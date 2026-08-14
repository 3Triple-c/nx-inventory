import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { getPurchase } from "@nx-inventory/purchasing";
import { listProducts } from "@nx-inventory/catalog";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  addPurchaseItemAction,
  removePurchaseItemAction,
  receivePurchaseAction,
} from "@/lib/purchasing";
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

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const [purchase, products] = await Promise.all([
    getPurchase(id),
    listProducts(business.businessId),
  ]);

  const isDraft = purchase.status === "DRAFT";
  const totalCost = purchase.items.reduce(
    (sum, item) => sum + Number(item.totalCost),
    0,
  );

  return (
    <PageContainer>
      <PageHeader
        title={purchase.purchaseNumber}
        description={`Status: ${purchase.status} - ${purchase.supplier.name} to ${purchase.warehouse.name}`}
        backHref="/purchasing"
        backLabel="Purchases"
      />

      <Section title="Items">
        {purchase.items.length === 0 && <EmptyState>No items yet - add one below.</EmptyState>}
        <div className="space-y-2">
          {purchase.items.map((item) => (
            <Card key={item.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{item.variant.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {Number(item.quantity)} {item.variant.unit.symbol} @ NGN {Number(item.unitCost)} = NGN{" "}
                    {Number(item.totalCost)}
                    {item.batchNumber && ` - batch ${item.batchNumber}`}
                    {item.expiryDate && ` - exp ${new Date(item.expiryDate).toLocaleDateString()}`}
                  </div>
                </div>
                {isDraft && (
                  <form action={removePurchaseItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="purchaseId" value={purchase.id} />
                    <Button type="submit" variant="secondary">
                      Remove
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
        <p className="text-sm font-medium">Total: NGN {totalCost}</p>
      </Section>

      {isDraft && (
        <Section title="Add item">
          <form action={addPurchaseItemAction} className="space-y-3">
            <input type="hidden" name="purchaseId" value={purchase.id} />
            <Field label="Product / variant">
              <Select name="variantId" required defaultValue="">
                <option value="" disabled>
                  Select variant
                </option>
                {products.flatMap((p) =>
                  p.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {p.name} - {v.name} ({v.unit.symbol}) - {v.trackingMode}
                    </option>
                  )),
                )}
              </Select>
            </Field>
            <Field label="Quantity">
              <Input name="quantity" type="number" step="0.01" required />
            </Field>
            <Field label="Unit cost">
              <Input name="unitCost" type="number" step="0.01" required />
            </Field>
            <Field label="Batch number (only if this variant is BATCH-tracked)">
              <Input name="batchNumber" />
            </Field>
            <Field label="Expiry date (only if BATCH-tracked)">
              <Input name="expiryDate" type="date" />
            </Field>
            <Button type="submit">Add item</Button>
          </form>
        </Section>
      )}

      {isDraft && purchase.items.length > 0 && (
        <form action={receivePurchaseAction}>
          <input type="hidden" name="purchaseId" value={purchase.id} />
          <Button type="submit">Receive purchase</Button>
        </form>
      )}
    </PageContainer>
  );
}
