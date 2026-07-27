"use client";

import { signIn } from "@nx-inventory/auth/client";

export default function LoginPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>Sign in</h1>
      <button
        onClick={() => {
          console.log("Clicked!");
          signIn.social({
            provider: "google",
            callbackURL: "/",
          });
        }}
      >
        Sign in with Google
      </button>
    </main>
  );
}
