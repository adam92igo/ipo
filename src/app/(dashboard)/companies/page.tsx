import { Building2, ClipboardCheck, Gauge } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  listLatestAssessmentsByCompany,
  listLatestCompletedAssessmentsByCompany,
} from "@/lib/data-access/assessments";
import { listCompanies } from "@/lib/data-access/companies";
import { requireOrgPageContext } from "@/lib/data-access/page-context";
import { CreateCompanyDialog } from "./create-company-dialog";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const ctx = await requireOrgPageContext();
  const [companies, latestAssessments, completedAssessments] = await Promise.all([
    listCompanies(ctx),
    listLatestAssessmentsByCompany(ctx),
    listLatestCompletedAssessmentsByCompany(ctx),
  ]);
  const canWrite = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm uppercase italic tracking-wider text-secondary">
            /Companies/
          </p>
          <h1 className="text-3xl font-extrabold text-primary">Companies</h1>
          <p className="text-muted-foreground">
            The companies this workspace is preparing for the public markets.
          </p>
        </div>
        {canWrite && <CreateCompanyDialog />}
      </div>

      {companies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <Building2 className="size-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-primary">No companies yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Add the first company to unlock the readiness assessment, valuation
                and roadmap modules.
              </p>
            </div>
            {canWrite && <CreateCompanyDialog />}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((company) => {
            const latest = latestAssessments.get(company.id);
            const completed = completedAssessments.get(company.id);
            return (
              <Card key={company.id}>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-primary">{company.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {company.sector}
                        {company.headcount ? ` · ${company.headcount} employees` : ""}
                      </p>
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline-offset-4 hover:text-secondary hover:underline"
                        >
                          {company.website}
                        </a>
                      )}
                    </div>
                    <Badge variant="outline" className="uppercase">
                      {company.country}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    {completed ? (
                      <div className="flex items-center gap-2">
                        <Gauge className="size-4 text-primary" />
                        <span className="text-sm font-bold text-primary">
                          {Math.round(Number(completed.globalScore))}% ready
                        </span>
                      </div>
                    ) : latest ? (
                      <span className="text-sm text-muted-foreground">
                        Assessment in progress
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not assessed yet
                      </span>
                    )}
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline" className="uppercase tracking-wider">
                        <Link href={`/companies/${company.id}/valuation`}>Valuation</Link>
                      </Button>
                      {completed && (
                        <Button asChild size="sm" variant="outline" className="uppercase tracking-wider">
                          <Link href={`/companies/${company.id}/results`}>Results</Link>
                        </Button>
                      )}
                      <Button asChild size="sm" className="uppercase tracking-wider">
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
