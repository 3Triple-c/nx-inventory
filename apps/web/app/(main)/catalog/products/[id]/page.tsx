import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { getProduct, listUnits } from "@nx-inventory/catalog";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createVariantAction } from "@/lib/catalog";
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

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const [product, units] = await Promise.all([
    getProduct(id),
    listUnits(business.businessId),
  ]);

  return (
    <PageContainer>
      <PageHeader title={product.name} backHref="/catalog" backLabel="Products" />

      <Section title="Product details">
        <Card>
          <div className="text-sm text-muted-foreground">
            {product.category ? `Category: ${product.category.name}` : "No category"}
          </div>
        </Card>
      </Section>

      <Section title="Variants">
        {product.variants.length === 0 && <EmptyState>No variants yet - add one below.</EmptyState>}
        <div className="space-y-3">
          {product.variants.map((v) => (
            <Card key={v.id}>
              <div className="font-medium">{v.name}</div>
              <div className="text-sm text-muted-foreground">
                {v.unit.name} ({v.unit.symbol}) - tracking: {v.trackingMode}
              </div>
              {(v.price || v.costPrice) && (
                <div className="text-sm text-muted-foreground">
                  {v.price ? `Price: NGN ${v.price}` : ""}
                  {v.price && v.costPrice ? " - " : ""}
                  {v.costPrice ? `Cost: NGN ${v.costPrice}` : ""}
                </div>
              )}
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Add variant">
        <form action={createVariantAction} className="space-y-3">
          <input type="hidden" name="productId" value={product.id} />
          <Field label="Name">
            <Input name="name" placeholder="500ml Bottle" required />
          </Field>
          <Field label="Unit">
            <Select name="unitId" required defaultValue="">
              <option value="" disabled>
                Select unit
              </option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tracking mode">
            <Select name="trackingMode" required defaultValue="NONE">
              <option value="NONE">Not tracked (NONE)</option>
              <option value="BATCH">Batch/expiry tracked (BATCH)</option>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price">
              <Input name="price" type="number" step="0.01" />
            </Field>
            <Field label="Cost price">
              <Input name="costPrice" type="number" step="0.01" />
            </Field>
          </div>
          <Button type="submit">Add variant</Button>
        </form>
      </Section>
    </PageContainer>
  );
}
