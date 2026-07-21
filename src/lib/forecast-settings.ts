import { z } from "zod";
import type { ForecastSettings } from "@/engines/forecast/types";
import forecastSettingsV1 from "../../config/forecast-settings.v1.json";
import { createVersionedConfig } from "./versioned-config";

export const forecastSettingsSchema = z.object({
  version: z.string().min(1),
  note: z.string(),
  horizonYears: z.number().int().min(1).max(15),
  terminalGrowth: z.number().min(0).max(0.05),
  growthClamp: z
    .object({ min: z.number().min(-0.5), max: z.number().max(1) })
    .refine((c) => c.min <= c.max, {
      message: "growthClamp.min must not exceed growthClamp.max",
    }),
  scenarioSpread: z.number().min(0).max(1),
});

export const CURRENT_FORECAST_SETTINGS_VERSION = "v1";

/** Config shape carries a `version`/`note`; engine settings are the rest. */
type ForecastSettingsFile = ForecastSettings & { version: string; note: string };

/** Parses and validates a versioned forecast-settings file, once per version. */
export const getForecastSettingsFile = createVersionedConfig<ForecastSettingsFile>(
  "forecast settings",
  { v1: forecastSettingsV1 },
  forecastSettingsSchema,
);

/** Engine-ready settings (drops the file metadata). */
export function getForecastSettings(
  version: string = CURRENT_FORECAST_SETTINGS_VERSION,
): ForecastSettings {
  const { horizonYears, terminalGrowth, growthClamp, scenarioSpread } =
    getForecastSettingsFile(version);
  return { horizonYears, terminalGrowth, growthClamp, scenarioSpread };
}
