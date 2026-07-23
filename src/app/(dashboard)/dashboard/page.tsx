import { Building2 } from "lucide-react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { getCockpitSnapshot } from "@/lib/data-access/cockpit";
import { requireOrgPageContext } from "@/lib/data-access/page-context";
import { DashboardView } from "./dashboard-view";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const ctx = await requireOrgPageContext();
  const snapshot = await getCockpitSnapshot(ctx);

  if (snapshot.kind === "no_company") {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeading
          eyebrow="Overview"
          title={ctx.organizationName}
          description="Your IPO readiness workspace. Start by adding the company you manage."
        />
        <InstrumentPanel className="flex flex-col items-center py-14 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <h2 className="mt-4 font-heading text-2xl font-extrabold uppercase text-primary">
            Add your company
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create the company profile to unlock the diagnostic, valuation,
            forecast, benchmark, market research, roadmap, and assistant.
          </p>
          <Button asChild className="mt-5">
            <Link href="/companies">Add a company</Link>
          </Button>
        </InstrumentPanel>
      </div>
    );
  }

  const { company } = snapshot;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading
        eyebrow="IPO position cockpit"
        title={company.name}
        description="Your latest stored readiness position, valuation evidence, and next public-market actions."
        metadata={
          <span className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarClock className="size-3.5" />
            Data snapshot · stored records
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/companies">Company profile</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/assistant">Ask assistant</Link>
            </Button>
          </div>
        }
      />

      <DashboardView snapshot={snapshot} />
    </div>
  );
}
