import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import {
  getTransfer,
  getAvailableBatchesForWarehouse,
} from "@nx-inventory/inventory";
import { listProducts } from "@nx-inventory/catalog";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  addTransferItemAction,
  removeTransferItemAction,
  completeTransferAction,
} from "@/lib/transfers";
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

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const transfer = await getTransfer(id);
  const [products, sourceBatches] = await Promise.all([
    listProducts(business.businessId),
    getAvailableBatchesForWarehouse(transfer.fromWarehouseId),
  ]);

  const isDraft = transfer.status === "DRAFT";
  const nonTrackedVariants = products.flatMap((p) =>
    p.variants
      .filter((v) => v.trackingMode === "NONE")
      .map((v) => ({ ...v, productName: p.name })),
  );

  return (
    <PageContainer>
      <PageHeader
        title={transfer.transferNumber}
        backHref="/transfers"
        backLabel="Transfers"
      />
      <p className="text-sm text-gray-500">
        Status: <strong>{transfer.status}</strong> —{" "}
        {transfer.fromWarehouse.name} → {transfer.toWarehouse.name}
      </p>

      <Section title="Items">
        {transfer.items.length === 0 && (
          <EmptyState>No items yet — add one below.</EmptyState>
        )}
        <div className="space-y-2">
          {transfer.items.map((item) => (
            <Card key={item.id}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{item.variant.name}</div>
                  <div className="text-sm text-gray-500">
                    {Number(item.quantity)} {item.variant.unit.symbol}
                    {item.batch && ` — batch ${item.batch.batchNumber}`}
                  </div>
                </div>
                {isDraft && (
                  <form action={removeTransferItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input
                      type="hidden"
                      name="transferId"
                      value={transfer.id}
                    />
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
              <EmptyState>
                No non-batch-tracked variants in your catalog.
              </EmptyState>
            )}
            {nonTrackedVariants.length > 0 && (
              <form action={addTransferItemAction} className="space-y-3">
                <input type="hidden" name="transferId" value={transfer.id} />
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
                <Button type="submit">Add item</Button>
              </form>
            )}
          </Section>

          <Section title="Add batch-tracked item">
            {sourceBatches.length === 0 && (
              <EmptyState>
                No in-stock batches at {transfer.fromWarehouse.name} to
                transfer.
              </EmptyState>
            )}
            {sourceBatches.length > 0 && (
              <form action={addTransferItemAction} className="space-y-3">
                <input type="hidden" name="transferId" value={transfer.id} />
                <Field label="Batch (from source warehouse's current stock)">
                  <Select name="batchSelection" defaultValue="">
                    <option value="" disabled>
                      Select batch
                    </option>
                    {sourceBatches.map((b) => (
                      <option key={b.id} value={`${b.id}::${b.variantId}`}>
                        {b.variant.product.name} — {b.variant.name} — batch{" "}
                        {b.batchNumber} ({Number(b.quantity)}{" "}
                        {b.variant.unit.symbol} available)
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quantity">
                  <Input name="quantity" type="number" step="0.01" required />
                </Field>
                <Button type="submit">Add item</Button>
              </form>
            )}
          </Section>
        </>
      )}

      {isDraft && transfer.items.length > 0 && (
        <form action={completeTransferAction}>
          <input type="hidden" name="transferId" value={transfer.id} />
          <Button type="submit">
            Complete transfer (updates stock at both warehouses)
          </Button>
        </form>
      )}
    </PageContainer>
  );
}
