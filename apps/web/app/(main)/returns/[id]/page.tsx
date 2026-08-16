import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import {
  getReturn,
  getAvailableBatchesForWarehouse,
  getAllBatchesForWarehouse,
} from "@nx-inventory/inventory";
import { listProducts } from "@nx-inventory/catalog";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  addReturnItemAction,
  removeReturnItemAction,
  completeReturnAction,
} from "@/lib/returns";
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

export default async function ReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const ret = await getReturn(id);
  const isCustomerReturn = ret.direction === "CUSTOMER_RETURN";

  const [products, batches] = await Promise.all([
    listProducts(business.businessId),
    // CUSTOMER_RETURN can go back into any existing batch (even one
    // currently at zero); SUPPLIER_RETURN can only remove from batches
    // that actually have stock — same reasoning as Adjustment's IN/OUT
    // batch pickers.
    isCustomerReturn
      ? getAllBatchesForWarehouse(ret.warehouseId)
      : getAvailableBatchesForWarehouse(ret.warehouseId),
  ]);

  const isDraft = ret.status === "DRAFT";
  const nonTrackedVariants = products.flatMap((p) =>
    p.variants
      .filter((v) => v.trackingMode === "NONE")
      .map((v) => ({ ...v, productName: p.name })),
  );

  return (
    <PageContainer>
      <PageHeader
        title={ret.returnNumber}
        backHref="/returns"
        backLabel="Returns"
      />
      <p className="text-sm text-gray-500">
        Status: <strong>{ret.status}</strong> —{" "}
        {isCustomerReturn
          ? `Customer return from sale ${ret.sale?.saleNumber}`
          : `Supplier return to purchase ${ret.purchase?.purchaseNumber}`}
        {" — "}
        {ret.warehouse.name}
        {ret.reason && ` — ${ret.reason}`}
      </p>

      <Section title="Items">
        {ret.items.length === 0 && (
          <EmptyState>No items yet — add one below.</EmptyState>
        )}
        <div className="space-y-2">
          {ret.items.map((item) => (
            <Card key={item.id}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{item.variant.name}</div>
                  <div className="text-sm text-gray-500">
                    {Number(item.quantity)} {item.variant.unit.symbol}
                    {item.batch && ` — batch ${item.batch.batchNumber}`}
                    {item.unitPrice && ` — ₦${Number(item.unitPrice)}`}
                    {item.note && ` — ${item.note}`}
                  </div>
                </div>
                {isDraft && (
                  <form action={removeReturnItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="returnId" value={ret.id} />
                    <Button type="submit" variant="secondary">
                      Remove
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {isDraft && (
        <>
          <Section title="Add non-tracked item">
            {nonTrackedVariants.length === 0 && (
              <EmptyState>No non-batch-tracked variants.</EmptyState>
            )}
            {nonTrackedVariants.length > 0 && (
              <form action={addReturnItemAction} className="space-y-3">
                <input type="hidden" name="returnId" value={ret.id} />
                <Field label="Product / variant">
                  <Select name="variantId" defaultValue="">
                    <option value="" disabled>
                      Select variant
                    </option>
                    {nonTrackedVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.productName} — {v.name} ({v.unit.symbol})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quantity">
                  <Input name="quantity" type="number" step="0.01" required />
                </Field>
                <Field label="Unit price (optional)">
                  <Input name="unitPrice" type="number" step="0.01" />
                </Field>
                <Field label="Note (optional)">
                  <Input name="note" />
                </Field>
                <Button type="submit">Add item</Button>
              </form>
            )}
          </Section>

          <Section title="Add batch-tracked item">
            {batches.length === 0 && (
              <EmptyState>
                {isCustomerReturn
                  ? `No existing batches at ${ret.warehouse.name} to return into.`
                  : `No in-stock batches at ${ret.warehouse.name} to return.`}
              </EmptyState>
            )}
            {batches.length > 0 && (
              <form action={addReturnItemAction} className="space-y-3">
                <input type="hidden" name="returnId" value={ret.id} />
                <Field label="Batch">
                  <Select name="batchSelection" required defaultValue="">
                    <option value="" disabled>
                      Select batch
                    </option>
                    {batches.map((b) => (
                      <option key={b.id} value={`${b.id}::${b.variantId}`}>
                        {b.variant.product.name} — {b.variant.name} — batch{" "}
                        {b.batchNumber}
                        {!isCustomerReturn &&
                          ` (${Number(b.quantity)} ${b.variant.unit.symbol} available)`}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quantity">
                  <Input name="quantity" type="number" step="0.01" required />
                </Field>
                <Field label="Unit price (optional)">
                  <Input name="unitPrice" type="number" step="0.01" />
                </Field>
                <Field label="Note (optional)">
                  <Input name="note" />
                </Field>
                <Button type="submit">Add item</Button>
              </form>
            )}
          </Section>
        </>
      )}

      {isDraft && ret.items.length > 0 && (
        <form action={completeReturnAction}>
          <input type="hidden" name="returnId" value={ret.id} />
          <Button type="submit">Complete return (updates stock)</Button>
        </form>
      )}
    </PageContainer>
  );
}
