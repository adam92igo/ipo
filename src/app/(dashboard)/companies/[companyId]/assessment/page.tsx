import {
  getAnswers,
  getOrCreateActiveAssessment,
} from "@/lib/data-access/assessments";
import { getCompany } from "@/lib/data-access/companies";
import { requireOrgPageContext } from "@/lib/data-access/page-context";
import { getQuestionnaire } from "@/lib/questionnaire";
import { AssessmentForm } from "./assessment-form";

export const metadata = { title: "Readiness assessment" };

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const ctx = await requireOrgPageContext();
  const company = await getCompany(ctx, companyId);
  const assessment = await getOrCreateActiveAssessment(ctx, company.id);
  const answers = await getAnswers(ctx, assessment.id);
  const questionnaire = getQuestionnaire(assessment.questionnaireVersion);

  return (
    <AssessmentForm
      assessmentId={assessment.id}
      companyId={company.id}
      companyName={company.name}
      questionnaire={questionnaire}
      initialAnswers={answers}
    />
  );
}
