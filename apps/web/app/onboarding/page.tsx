import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createBusinessAction } from "@/app/lib/actions";

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
          <label>
            Business type
            <select name="type" defaultValue="GENERIC">
              <option value="GENERIC">General</option>
              <option value="PHARMACY">Pharmacy</option>
              <option value="SUPERMARKET">Supermarket</option>
              <option value="RESTAURANT">Restaurant</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="POULTRY">Poultry</option>
              <option value="MANUFACTURING">Manufacturing</option>
              {/* full list is in enums.prisma — add as needed */}
            </select>
          </label>
        </div>
        <button type="submit">Create business</button>
      </form>
    </main>
  );
}
