import { computeBenchmark, type BenchmarkResult } from "@/engines/benchmark";
import { matchSector, matchSectorKey } from "@/engines/valuation";
import { getLatestCompletedAssessment } from "./assessments";
import { getCompany, type Company } from "./companies";
import { listFinancialsFor } from "./financials";
import type { OrgContext } from "./org-context";
import {
  CURRENT_VALUATION_REFS_VERSION,
  getValuationRefs,
} from "@/lib/valuation-refs";
import {
  CURRENT_PEER_COMPANIES_VERSION,
  getPeersForSector,
} from "@/lib/peer-companies";
import { getQuestionnaire, CURRENT_QUESTIONNAIRE_VERSION } from "@/lib/questionnaire";

/** Category (id,label) pairs from the current questionnaire, for readiness rows. */
function categoryLabels() {
  return getQuestionnaire(CURRENT_QUESTIONNAIRE_VERSION).categories.map((c) => ({
    id: c.id,
    label: c.label,
  }));
}

export interface CompanyBenchmark {
  company: Company;
  result: BenchmarkResult;
}

/**
 * Assembles a company's benchmark view (tenant-scoped): its financials + latest
 * completed assessment scores, benchmarked against the versioned sector refs,
 * the curated peer set, and the IPO-ready readiness target. Org id comes only
 * from the session; all reads go through data-access.
 */
export async function getCompanyBenchmark(
  ctx: OrgContext,
  companyId: string,
): Promise<CompanyBenchmark> {
  const company = await getCompany(ctx, companyId); // proves org ownership
  const [financials, latestAssessment] = await Promise.all([
    listFinancialsFor(ctx, company),
    getLatestCompletedAssessment(ctx, companyId),
  ]);

  const refs = getValuationRefs(CURRENT_VALUATION_REFS_VERSION);
  const sectorRefs = matchSector(company.sector, refs);
  const sectorKey = matchSectorKey(company.sector, refs);
  const peers = getPeersForSector(sectorKey, CURRENT_PEER_COMPANIES_VERSION);

  const questionnaire = getQuestionnaire(CURRENT_QUESTIONNAIRE_VERSION);

  const result = computeBenchmark({
    financials,
    sectorRefs,
    sectorLabel: sectorRefs.label,
    refsVersion: CURRENT_VALUATION_REFS_VERSION,
    peers,
    peersVersion: CURRENT_PEER_COMPANIES_VERSION,
    categoryScores:
      (latestAssessment?.categoryScores as Record<string, number> | null) ?? null,
    categoryLabels: categoryLabels(),
    // IPO-ready bar = the questionnaire's "strength" threshold.
    readinessTarget: questionnaire.thresholds.strength,
  });

  return { company, result };
}
