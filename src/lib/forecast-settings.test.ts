import { describe, expect, it } from "vitest";
import {
  CURRENT_FORECAST_SETTINGS_VERSION,
  getForecastSettings,
  getForecastSettingsFile,
} from "./forecast-settings";

describe("forecast settings config", () => {
  it("loads and validates the current version", () => {
    const file = getForecastSettingsFile(CURRENT_FORECAST_SETTINGS_VERSION);
    expect(file.version).toBe(CURRENT_FORECAST_SETTINGS_VERSION);
    expect(file.horizonYears).toBeGreaterThan(0);
    expect(file.growthClamp.min).toBeLessThanOrEqual(file.growthClamp.max);
  });

  it("returns engine-ready settings without file metadata", () => {
    const settings = getForecastSettings();
    expect(settings).toEqual({
      horizonYears: 5,
      terminalGrowth: 0.018,
      growthClamp: { min: 0, max: 0.25 },
      scenarioSpread: 0.3,
    });
  });

  it("throws on an unknown version", () => {
    expect(() => getForecastSettingsFile("v99")).toThrow(/Unknown forecast/);
  });
});
