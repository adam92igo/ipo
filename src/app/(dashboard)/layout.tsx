import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getCachedSession } from "@/lib/data-access/context";
import { requireOrgPageContext } from "@/lib/data-access/page-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();
  if (!session) redirect("/sign-in");
  const ctx = await requireOrgPageContext();

  return (
    <SidebarProvider>
      <AppSidebar
        organizationName={ctx.organizationName}
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm font-semibold text-primary">
            {ctx.organizationName}
          </span>
          <span className="ml-auto rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {ctx.role}
          </span>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
