import { Building2, ClipboardCheck, Gauge } from "lucide-react";
import Link from "next/link";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listLatestAssessmentsByCompany,
  listLatestCompletedAssessmentsByCompany,
  type Assessment,
} from "@/lib/data-access/assessments";
import { listCompanies } from "@/lib/data-access/companies";
import { requireOrgPageContext } from "@/lib/data-access/page-context";
import { isAiConfigured } from "@/lib/ai/config";
import { CreateCompanyDialog } from "./create-company-dialog";

export const metadata = { title: "Company" };

export default async function CompaniesPage() {
  const ctx = await requireOrgPageContext();
  const [companies, latestAssessments, completedAssessments] = await Promise.all([
    listCompanies(ctx),
    listLatestAssessmentsByCompany(ctx),
    listLatestCompletedAssessmentsByCompany(ctx),
  ]);
  const canWrite = ctx.role === "owner" || ctx.role === "admin";
  const aiConfigured = isAiConfigured();
  const hasCompany = companies.length > 0;
  const company = companies[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeading
        eyebrow="Company profile"
        title={company?.name ?? "Set up your company"}
        description="The single company this workspace is preparing for the French public markets."
        actions={
          canWrite && !hasCompany ? (
            <CreateCompanyDialog aiEnabled={aiConfigured} />
          ) : undefined
        }
      />

      {!hasCompany ? (
        <InstrumentPanel className="flex flex-col items-center border-dashed py-16 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-muted">
            <Building2 className="size-6 text-primary" />
          </div>
          <h2 className="mt-4 font-heading text-2xl font-extrabold uppercase tracking-wide text-primary">
            No company profile yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add your company to unlock the readiness assessment, valuation and
            roadmap modules.
          </p>
          {canWrite && (
            <div className="mt-5">
              <CreateCompanyDialog aiEnabled={aiConfigured} />
            </div>
          )}
        </InstrumentPanel>
      ) : (
        <CompanyProfile
          company={company}
          latest={latestAssessments.get(company.id)}
          completed={completedAssessments.get(company.id)}
        />
      )}
    </div>
  );
}

function CompanyProfile({
  company,
  latest,
  completed,
}: {
  company: Awaited<ReturnType<typeof listCompanies>>[number];
  latest: Assessment | undefined;
  completed: Assessment | undefined;
}) {
  return (
    <InstrumentPanel
      eyebrow="Issuer record"
      title="Company details"
      className="p-0 [&>header]:px-5 [&>header]:pt-5"
    >
      <dl className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Sector", company.sector],
          ["Country", company.country],
          [
            "Headcount",
            company.headcount ? `${company.headcount} employees` : "Not provided",
          ],
          ["SIREN", company.siren ?? "Not provided"],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-border p-5 sm:border-r lg:border-b-0">
            <dt className="instrument-label">{label}</dt>
            <dd className="mt-2 font-heading text-lg font-bold uppercase tracking-wide text-primary">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {company.website && (
        <div className="border-t border-border px-5 py-4 text-sm">
          <span className="instrument-label mr-3">Official website</span>
          <a
            href={company.website}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            {company.website}
          </a>
        </div>
      )}
      <div className="flex flex-col gap-4 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {completed ? (
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-primary" />
            <span className="font-utility text-sm font-semibold text-primary">
              {Math.round(Number(completed.globalScore))}% ready
            </span>
          </div>
        ) : latest ? (
          <Badge variant="outline">Assessment in progress</Badge>
        ) : (
          <Badge variant="outline">Not assessed yet</Badge>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/companies/${company.id}/valuation`}>Valuation</Link>
          </Button>
          {completed && (
            <>
              <Button asChild size="sm" variant="outline">
                <Link href={`/companies/${company.id}/results`}>Results</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/companies/${company.id}/roadmap`}>Roadmap</Link>
              </Button>
            </>
          )}
          <Button asChild size="sm">
            <Link href={`/companies/${company.id}/assessment`}>
              <ClipboardCheck data-slot="icon" />
              {latest?.status === "in_progress"
                ? "Continue"
                : completed
                  ? "Reassess"
                  : "Assess"}
            </Link>
          </Button>
        </div>
      </div>
    </InstrumentPanel>
  );
}
