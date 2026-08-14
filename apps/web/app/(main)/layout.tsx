import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@nx-inventory/auth";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession(await headers());

  if (!session) {
    redirect("/login");
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar userName={session.user.name} userEmail={session.user.email} />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <SidebarTrigger />
            <div className="text-sm font-medium text-muted-foreground">
              Inventory workspace
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
