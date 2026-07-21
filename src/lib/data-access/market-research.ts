import {
  profileFromFinancials,
  recommendSegment,
  type SegmentRecommendation,
} from "@/engines/market-research";
import { matchSectorKey } from "@/engines/valuation";
import { getCompany, type Company } from "./companies";
import { listFinancialsFor } from "./financials";
import { getLatestValuationRunFor, type ValuationRunResults } from "./valuations";
import type { OrgContext } from "./org-context";
import {
  CURRENT_VALUATION_REFS_VERSION,
  getValuationRefs,
} from "@/lib/valuation-refs";
import {
  CURRENT_MARKET_RESEARCH_VERSION,
  getMarketResearchFile,
  getSectorContext,
  getSegmentRules,
  type SectorContext,
} from "@/lib/market-research";

export interface CompanyMarketResearch {
  company: Company;
  version: string;
  sectorContext: SectorContext;
  listingActNote: string;
  recommendation: SegmentRecommendation;
  /** Basis used for sizing, surfaced in the UI. */
  hasValuation: boolean;
  hasFinancials: boolean;
}

/**
 * Assembles a company's market-research view (tenant-scoped): sector market
 * context, the Euronext admission segments, and a deterministic segment
 * recommendation from the company's size profile (valuation mid or revenue
 * proxy + audited years). Org id comes only from the session.
 */
export async function getCompanyMarketResearch(
  ctx: OrgContext,
  companyId: string,
): Promise<CompanyMarketResearch> {
  const company = await getCompany(ctx, companyId); // proves org ownership
  const [financials, valuationRun] = await Promise.all([
    listFinancialsFor(ctx, company),
    getLatestValuationRunFor(ctx, company),
  ]);

  const refs = getValuationRefs(CURRENT_VALUATION_REFS_VERSION);
  const sectorKey = matchSectorKey(company.sector, refs);
  const sectorContext = getSectorContext(sectorKey, CURRENT_MARKET_RESEARCH_VERSION);

  const valuationMid = valuationRun
    ? (valuationRun.results as ValuationRunResults).aggregated.mid
    : null;

  const profile = profileFromFinancials(financials, {
    headcount: company.headcount,
    valuationMid,
  });

  const recommendation = recommendSegment({
    profile,
    rules: getSegmentRules(CURRENT_MARKET_RESEARCH_VERSION),
  });

  const listingActNote = getMarketResearchFile(
    CURRENT_MARKET_RESEARCH_VERSION,
  ).listingActNote;

  return {
    company,
    version: CURRENT_MARKET_RESEARCH_VERSION,
    sectorContext,
    listingActNote,
    recommendation,
    hasValuation: valuationMid !== null,
    hasFinancials: financials.length > 0,
  };
}
