import {
  getActiveAssessment,
  getAnswersFor,
} from "@/lib/data-access/assessments";
import { getCompany } from "@/lib/data-access/companies";
import { orNotFound, requireOrgPageContext } from "@/lib/data-access/page-context";
import {
  CURRENT_QUESTIONNAIRE_VERSION,
  getQuestionnaire,
} from "@/lib/questionnaire";
import { AssessmentForm } from "./assessment-form";

export const metadata = { title: "Readiness assessment" };

/**
 * Pure read — no row is created by rendering (link prefetches hit this).
 * The assessment row is created by startAssessmentAction on the first answer.
 */
export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const ctx = await requireOrgPageContext();

  const company = await orNotFound(() => getCompany(ctx, companyId));
  const active = await getActiveAssessment(ctx, company.id);
  const answers = active ? await getAnswersFor(ctx, active) : {};
  const questionnaire = getQuestionnaire(
    active?.questionnaireVersion ?? CURRENT_QUESTIONNAIRE_VERSION,
  );

  return (
    <AssessmentForm
      assessmentId={active?.id ?? null}
      companyId={company.id}
      companyName={company.name}
      questionnaire={questionnaire}
      initialAnswers={answers}
    />
  );
}
