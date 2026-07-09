import { Building2, ClipboardCheck, LineChart, Map, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listCompanies } from "@/lib/data-access/companies";
import { requireOrgPageContext } from "@/lib/data-access/page-context";

export const metadata = { title: "Overview" };

const modules = [
  {
    title: "Readiness Assessment",
    description:
      "100 weighted questions across Governance, Finance, Growth, Compliance and Reporting.",
    icon: ClipboardCheck,
    href: "/companies",
  },
  {
    title: "Valuation",
    description: "DCF, sector comparables and market multiples with an aggregated range.",
    icon: LineChart,
    href: "/companies",
  },
  {
    title: "Roadmap",
    description: "A prioritised action plan generated from your assessment results.",
    icon: Map,
    href: "/companies",
  },
  {
    title: "AI Assistant",
    description: "IPO process answers, aware of your companies' readiness data.",
    icon: Sparkles,
    href: "/assistant",
  },
];

export default async function DashboardPage() {
  const ctx = await requireOrgPageContext();
  const companies = await listCompanies(ctx);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-1">
        <p className="text-sm uppercase italic tracking-wider text-secondary">
          /Overview/
        </p>
        <h1 className="text-3xl font-extrabold text-primary">
          {ctx.organizationName}
        </h1>
        <p className="text-muted-foreground">
          Your IPO readiness workspace. Start by adding the companies you manage.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary">
              <Building2 className="size-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-primary">Companies</CardTitle>
              <CardDescription>
                {companies.length === 0
                  ? "No companies yet"
                  : `${companies.length} compan${companies.length > 1 ? "ies" : "y"} in this workspace`}
              </CardDescription>
            </div>
          </div>
          <Button asChild className="uppercase tracking-[0.15em]">
            <Link href="/companies">
              {companies.length === 0 ? "Add a company" : "Manage"}
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        <p className="text-sm uppercase italic tracking-wider text-secondary">
          /Modules/
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {modules.map((item) => (
            <Link key={item.title} href={item.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader>
                  <item.icon className="mb-2 size-6 text-primary" />
                  <CardTitle className="text-base text-primary">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
