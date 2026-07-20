import {
  forecastFinancials,
  NotForecastableError,
  type ForecastResult,
} from "@/engines/forecast";
import type { FinancialYear } from "@/engines/valuation/types";
import {
  CURRENT_FORECAST_SETTINGS_VERSION,
  getForecastSettings,
} from "@/lib/forecast-settings";
import { getCompany, type Company } from "./companies";
import { listFinancialsFor } from "./financials";
import type { OrgContext } from "./org-context";

export interface CompanyForecast {
  company: Company;
  financials: FinancialYear[];
  settingsVersion: string;
  /** Null when the history cannot support a projection, with the reason. */
  result: ForecastResult | null;
  unavailableReason: string | null;
}

/**
 * Reads a company's financial history (tenant-scoped) and runs the pure
 * forecast engine against the current versioned settings. All reads go through
 * data-access; the org id is never taken from client input.
 */
export async function getCompanyForecast(
  ctx: OrgContext,
  companyId: string,
): Promise<CompanyForecast> {
  const company = await getCompany(ctx, companyId); // proves org ownership
  const financials = await listFinancialsFor(ctx, company);
  const settings = getForecastSettings(CURRENT_FORECAST_SETTINGS_VERSION);

  try {
    const result = forecastFinancials({
      financials,
      settings,
      version: CURRENT_FORECAST_SETTINGS_VERSION,
    });
    return {
      company,
      financials,
      settingsVersion: CURRENT_FORECAST_SETTINGS_VERSION,
      result,
      unavailableReason: null,
    };
  } catch (error) {
    if (error instanceof NotForecastableError) {
      return {
        company,
        financials,
        settingsVersion: CURRENT_FORECAST_SETTINGS_VERSION,
        result: null,
        unavailableReason: error.reason,
      };
    }
    throw error;
  }
}
