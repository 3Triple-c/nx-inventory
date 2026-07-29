import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createBusinessAction } from "@/lib/actions";
import { FieldSelect } from "@/components/auth/businesstypefield";
export default async function OnboardingPage() {
  const session = await getSession(await headers());
  if (!session) {
    redirect("/login");
  }

  // Already has a business — nothing to onboard, send them to the dashboard.
  const existing = await getUserBusinessContext(session.user.id);
  if (existing) {
    redirect("/");
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Set up your business</h1>
      <form action={createBusinessAction}>
        <div>
          <label>
            Business name
            <input name="name" required />
          </label>
        </div>
        <div>
          <FieldSelect />
        </div>
        <button type="submit">Create business</button>
      </form>
    </main>
  );
}
