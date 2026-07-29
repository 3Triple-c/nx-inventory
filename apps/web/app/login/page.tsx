"use client";

import { signIn } from "@nx-inventory/auth/client";
import { Button } from "@/components/ui/button";
export default function LoginPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>Sign in</h1>
      <Button
        onClick={() => {
          console.log("Clicked!");
          signIn.social({
            provider: "google",
            callbackURL: "/",
          });
        }}
      >
        Sign in with Google
      </Button>
    </main>
  );
}
