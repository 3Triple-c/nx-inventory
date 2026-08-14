"use client";

import { signIn } from "@nx-inventory/auth/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, PageContainer } from "@/components/ui";
import { ModeToggle } from "@/components/ui/theme-toogle";

export default function LoginPage() {
  return (
    <main className="min-h-svh bg-background">
      <PageContainer className="flex min-h-svh max-w-md items-center">
        <Card className="w-full space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Logo size={40} glow />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Sign in
                </h1>
                <p className="text-sm text-muted-foreground">
                  Continue to your inventory workspace.
                </p>
              </div>
            </div>
            <ModeToggle />
          </div>

          <Button
            className="w-full"
            onClick={() => {
              signIn.social({
                provider: "google",
                callbackURL: "/",
              });
            }}
          >
            Sign in with Google
          </Button>
        </Card>
      </PageContainer>
    </main>
  );
}
