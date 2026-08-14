import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createBusinessAction } from "@/lib/actions";
import { FieldSelect } from "@/components/auth/businesstypefield";
import { FieldInput } from "@/components/auth/businessname";
import { Button } from "@/components/ui/button";
import { Card, PageContainer } from "@/components/ui";

export default async function OnboardingPage() {
  const session = await getSession(await headers());
  if (!session) {
    redirect("/login");
  }

  // Already has a business - nothing to onboard, send them to the dashboard.
  const existing = await getUserBusinessContext(session.user.id);
  if (existing) {
    redirect("/");
  }

  return (
    <main className="min-h-svh bg-background">
      <PageContainer className="flex min-h-svh max-w-lg items-center">
        <Card className="w-full space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Set up your business
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This creates the workspace your inventory, purchases, and sales
              will belong to.
            </p>
          </div>
          <form action={createBusinessAction} className="space-y-4">
            <FieldInput />
            <FieldSelect />
            <Button type="submit">Create business</Button>
          </form>
        </Card>
      </PageContainer>
    </main>
  );
}
