import { afterEach, describe, expect, it, vi } from "vitest";
import { verifySirenAtPappers } from "./pappers";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("verifySirenAtPappers", () => {
  it("returns 'confirmed' when Pappers finds the SIREN", async () => {
    vi.stubEnv("PAPPERS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ siren: "123456789", nom_entreprise: "ACME SAS" }),
      }),
    );

    await expect(verifySirenAtPappers("123456789")).resolves.toBe("confirmed");
  });

  it("returns 'not_found' when Pappers has no record for the SIREN", async () => {
    vi.stubEnv("PAPPERS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );

    await expect(verifySirenAtPappers("000000000")).resolves.toBe("not_found");
  });

  it("returns 'unreachable' when Pappers is not configured", async () => {
    vi.stubEnv("PAPPERS_API_KEY", "");

    await expect(verifySirenAtPappers("123456789")).resolves.toBe("unreachable");
  });

  it("returns 'unreachable' when the request times out or errors", async () => {
    vi.stubEnv("PAPPERS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("timeout")),
    );

    await expect(verifySirenAtPappers("123456789")).resolves.toBe("unreachable");
  });

  it("returns 'unreachable' on a non-404 server error", async () => {
    vi.stubEnv("PAPPERS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );

    await expect(verifySirenAtPappers("123456789")).resolves.toBe("unreachable");
  });

  it("returns 'unreachable' when the response shape is unusable", async () => {
    vi.stubEnv("PAPPERS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );

    await expect(verifySirenAtPappers("123456789")).resolves.toBe("unreachable");
  });
});
