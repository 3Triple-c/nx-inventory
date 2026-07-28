import { getSession } from "@nx-inventory/auth";
import { getUserBusinessContext } from "@nx-inventory/organisation";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "./components/auth/signoutbutton";


export default async function Home() {
  const session = await getSession(await headers());

  if (!session) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Not logged in</h1>
        <Link href="/login">Go to login</Link>
      </main>
    );
  }

  const business = await getUserBusinessContext(session.user.id);
  if (!business) {
    redirect("/onboarding");
  }

  return (
      <main style={{ padding: 40 }}>
        <h1>Logged in</h1>
        <p>Name: {session.user.name}</p>
        <p>Email: {session.user.email}</p>
        <p>User ID: {session.user.id}</p>
        <p>
          Session expires:{" "}
          {new Date(session.session.expiresAt).toLocaleString()}
        </p>
        <hr />
        <p>Business: {business.businessName}</p>
        <p>Your role: {business.role}</p>
        <SignOutButton />
      </main>
    
  );
}
