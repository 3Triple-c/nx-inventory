import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import {
  getAdjustment,
  getAvailableBatchesForWarehouse,
  getAllBatchesForWarehouse,
} from "@nx-inventory/inventory";
import { listProducts } from "@nx-inventory/catalog";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  addAdjustmentItemAction,
  removeAdjustmentItemAction,
  approveAdjustmentAction,
  cancelAdjustmentAction,
} from "@/lib/adjustments";
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

const APPROVER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export default async function AdjustmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const adjustment = await getAdjustment(id);
  const [products, outBatches, allBatches] = await Promise.all([
    listProducts(business.businessId),
    getAvailableBatchesForWarehouse(adjustment.warehouseId),
    getAllBatchesForWarehouse(adjustment.warehouseId),
  ]);

  const isDraft = adjustment.status === "DRAFT";
  const canApprove = APPROVER_ROLES.includes(business.role);
  const nonTrackedVariants = products.flatMap((p) =>
    p.variants
      .filter((v) => v.trackingMode === "NONE")
      .map((v) => ({ ...v, productName: p.name })),
  );

  return (
    <PageContainer>
      <PageHeader
        title={adjustment.adjustmentNumber}
        backHref="/adjustments"
        backLabel="Adjustments"
      />
      <p className="text-sm text-gray-500">
        Status: <strong>{adjustment.status}</strong> — {adjustment.type} —{" "}
        {adjustment.warehouse.name}
        {adjustment.reason && ` — ${adjustment.reason}`}
      </p>
      {adjustment.status === "APPROVED" && (
        <p className="text-sm text-gray-500">
          Approved by {adjustment.approvedBy?.name} on{" "}
          {new Date(adjustment.approvedAt!).toLocaleString()}
        </p>
      )}

      <Section title="Items">
        {adjustment.items.length === 0 && (
          <EmptyState>No items yet — add one below.</EmptyState>
        )}
        <div className="space-y-2">
          {adjustment.items.map((item) => (
            <Card key={item.id}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    {item.direction === "IN" ? "+" : "−"} {item.variant.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {Number(item.quantity)} {item.variant.unit.symbol}
                    {item.batch && ` — batch ${item.batch.batchNumber}`}
                    {!item.batch &&
                      item.batchNumber &&
                      ` — new batch ${item.batchNumber}`}
                    {item.note && ` — ${item.note}`}
                  </div>
                </div>
                {isDraft && (
                  <form action={removeAdjustmentItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input
                      type="hidden"
                      name="adjustmentId"
                      value={adjustment.id}
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
              <EmptyState>No non-batch-tracked variants.</EmptyState>
            )}
            {nonTrackedVariants.length > 0 && (
              <form action={addAdjustmentItemAction} className="space-y-3">
                <input
                  type="hidden"
                  name="adjustmentId"
                  value={adjustment.id}
                />
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
                <Field label="Direction">
                  <Select name="direction" defaultValue="OUT">
                    <option value="IN">IN (adds stock)</option>
                    <option value="OUT">OUT (removes stock)</option>
                  </Select>
                </Field>
                <Field label="Quantity">
                  <Input name="quantity" type="number" step="0.01" required />
                </Field>
                <Field label="Note (optional)">
                  <Input name="note" />
                </Field>
                <Button type="submit">Add item</Button>
              </form>
            )}
          </Section>

          <Section title="Add batch-tracked item — OUT (from existing stock)">
            {outBatches.length === 0 && (
              <EmptyState>
                No in-stock batches at {adjustment.warehouse.name}.
              </EmptyState>
            )}
            {outBatches.length > 0 && (
              <form action={addAdjustmentItemAction} className="space-y-3">
                <input
                  type="hidden"
                  name="adjustmentId"
                  value={adjustment.id}
                />
                <input type="hidden" name="direction" value="OUT" />
                <Field label="Batch">
                  <Select name="batchSelection" defaultValue="">
                    <option value="" disabled>
                      Select batch
                    </option>
                    {outBatches.map((b) => (
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
                <Field label="Note (optional)">
                  <Input name="note" />
                </Field>
                <Button type="submit">Add item</Button>
              </form>
            )}
          </Section>

          <Section title="Add batch-tracked item — IN (found stock)">
            <form action={addAdjustmentItemAction} className="space-y-3">
              <input type="hidden" name="adjustmentId" value={adjustment.id} />
              <input type="hidden" name="direction" value="IN" />
              <Field label="Existing batch (leave as 'New batch' to create one)">
                <Select name="batchSelection" defaultValue="">
                  <option value="">
                    — New batch (fill in details below) —
                  </option>
                  {allBatches.map((b) => (
                    <option key={b.id} value={`${b.id}::${b.variantId}`}>
                      {b.variant.product.name} — {b.variant.name} — batch{" "}
                      {b.batchNumber}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="text-sm text-gray-500">
                If creating a new batch, fill these in:
              </p>
              <Field label="New batch — variant">
                <Select name="variantId" defaultValue="">
                  <option value="">
                    Not applicable (using existing batch above)
                  </option>
                  {products
                    .flatMap((p) =>
                      p.variants
                        .filter((v) => v.trackingMode === "BATCH")
                        .map((v) => ({ ...v, productName: p.name })),
                    )
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.productName} — {v.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="New batch number">
                <Input name="batchNumber" />
              </Field>
              <Field label="New batch expiry (optional)">
                <Input name="expiryDate" type="date" />
              </Field>
              <Field label="Quantity">
                <Input name="quantity" type="number" step="0.01" required />
              </Field>
              <Field label="Note (optional)">
                <Input name="note" />
              </Field>
              <Button type="submit">Add item</Button>
            </form>
          </Section>
        </>
      )}

      {isDraft && (
        <div className="flex gap-3">
          {adjustment.items.length > 0 && canApprove && (
            <form action={approveAdjustmentAction}>
              <input type="hidden" name="adjustmentId" value={adjustment.id} />
              <Button type="submit">Approve (updates stock)</Button>
            </form>
          )}
          {adjustment.items.length > 0 && !canApprove && (
            <EmptyState>
              Only an OWNER, ADMIN, or MANAGER can approve this.
            </EmptyState>
          )}
          <form action={cancelAdjustmentAction}>
            <input type="hidden" name="adjustmentId" value={adjustment.id} />
            <Button type="submit" variant="secondary">
              Cancel adjustment
            </Button>
          </form>
        </div>
      )}
    </PageContainer>
  );
}
