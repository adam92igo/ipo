"use client";

import {
  Building2,
  Compass,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";

const mainNav = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Companies", href: "/companies", icon: Building2 },
  { title: "AI Assistant", href: "/assistant", icon: Sparkles },
];

export function AppSidebar({
  organizationName,
  userName,
  userEmail,
}: {
  organizationName: string;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Compass className="size-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-[0.15em] text-white">
              IPO Compass
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {organizationName}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase italic tracking-wider text-[#c187a1]">
            /Workspace/
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
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
      </SidebarContent>
      <SidebarFooter>
        <UserMenu userName={userName} userEmail={userEmail} />
      </SidebarFooter>
    </Sidebar>
  );
}
