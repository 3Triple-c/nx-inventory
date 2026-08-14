import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { listCategories } from "@nx-inventory/catalog";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createProductAction } from "@/lib/catalog";
import {
  PageContainer,
  PageHeader,
  Section,
  Field,
  Input,
  Select,
  Button,
  EmptyState,
} from "@/components/ui";

export default async function NewProductPage() {
  const session = await getSession(await headers());
  if (!session) redirect("/login");

  const business = await getUserBusinessContext(session.user.id);
  if (!business) redirect("/onboarding");

  const categories = await listCategories(business.businessId);

  return (
    <PageContainer>
      <PageHeader title="Add product" backHref="/catalog" backLabel="Products" />

      <Section title="Product details">
        <form action={createProductAction} className="space-y-3">
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Category">
            <Select name="categoryId">
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Create product</Button>
        </form>
      </Section>

      <EmptyState>
        Next you will add at least one variant on the product page. That is
        where units, pricing, and batch tracking are set.
      </EmptyState>
    </PageContainer>
  );
}
