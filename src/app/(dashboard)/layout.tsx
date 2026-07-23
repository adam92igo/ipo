import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { PersonaProvider } from "@/components/layout/persona-context";
import { listCompanies } from "@/lib/data-access/companies";
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
  const [company] = await listCompanies(ctx);

  return (
    <PersonaProvider>
      <div className="flex min-h-svh flex-col">
        <AppHeader
          company={company ?? null}
          organizationName={ctx.organizationName}
          role={ctx.role}
          userName={session.user.name}
          userEmail={session.user.email}
        />
        <main className="workspace-grid flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </PersonaProvider>
  );
}
