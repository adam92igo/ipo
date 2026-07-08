"use client";

import {
  Building2,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LineChart,
  Map,
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";

const mainNav = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Companies", href: "/companies", icon: Building2 },
];

const upcomingNav = [
  { title: "Readiness Assessment", icon: ClipboardCheck, module: "2" },
  { title: "Valuation", icon: LineChart, module: "3" },
  { title: "Roadmap", icon: Map, module: "4" },
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
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase italic tracking-wider text-[#c187a1]">
            /Coming soon/
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {upcomingNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton disabled className="opacity-60">
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="text-sidebar-foreground/50">
                    M{item.module}
                  </SidebarMenuBadge>
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
