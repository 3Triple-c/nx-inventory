"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Home,
  PackageSearch,
  Receipt,
  Settings2,
  ShoppingCart,
  Tags,
  Warehouse,
  ArrowRightLeft,
  Columns3Cog,
  Redo2,
  Users,
  Bell,
  BellDot,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/auth/signoutbutton";
import { ModeToggle } from "@/components/ui/theme-toogle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const sections = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", href: "/", icon: Home },
      { title: "Stock", href: "/stock", icon: PackageSearch },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", href: "/catalog", icon: Boxes },
      { title: "Warehouses", href: "/catalog/warehouses", icon: Warehouse },
      { title: "Setup", href: "/catalog/setup", icon: Settings2 },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Purchasing", href: "/purchasing", icon: ShoppingCart },
      { title: "Suppliers", href: "/purchasing/suppliers", icon: Tags },
      { title: "Sales", href: "/sales", icon: Receipt },
      { title: "Transfers", href: "/transfers", icon: ArrowRightLeft },
      { title: "Adjustments", href: "/adjustments", icon: Columns3Cog },
      { title: "Returns", href: "/returns", icon: Redo2 },
      { title: "Customers", href: "/customers", icon: Users },
      { title: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  userName,
  userEmail,
}: {
  userName?: string | null;
  userEmail?: string | null;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="NX Inventory">
              <Link href="/">
                <Logo size={28} />
                <span className="font-semibold">NX Inventory</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActivePath(pathname, item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupLabel>Quick create</SidebarGroupLabel>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                asChild
                isActive={pathname === "/catalog/products/new"}
              >
                <Link href="/catalog/products/new">Product</Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                asChild
                isActive={pathname === "/purchasing/new"}
              >
                <Link href="/purchasing/new">Purchase</Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                asChild
                isActive={pathname === "/sales/new"}
              >
                <Link href="/sales/new">Sale</Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3 group-data-[collapsible=icon]:hidden">
          <div className="truncate text-sm font-medium">
            {userName || "Signed in"}
          </div>
          {userEmail && (
            <div className="truncate text-xs text-sidebar-foreground/70">
              {userEmail}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <ModeToggle />
          <div className="group-data-[collapsible=icon]:hidden">
            <SignOutButton />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
