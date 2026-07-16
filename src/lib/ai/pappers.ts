import { z } from "zod";
import { isPappersConfigured } from "./config";

/**
 * Pappers (French company registry API) — the ONLY registry source for the
 * MVP, per the brief. No LinkedIn scraping (ToS + GDPR).
 */

export interface PappersCompanyData {
  siren: string;
  legalName: string;
  nafLabel: string | null;
  headcountRange: string | null;
  legalForm: string | null;
  city: string | null;
}

const pappersResultSchema = z.object({
  siren: z.string(),
  nom_entreprise: z.string(),
  libelle_code_naf: z.string().nullish(),
  effectif: z.string().nullish(),
  forme_juridique: z.string().nullish(),
  siege: z.object({ ville: z.string().nullish() }).nullish(),
});

/** Maps one raw Pappers search result; null when the shape is unusable (pure, tested). */
export function mapPappersResult(raw: unknown): PappersCompanyData | null {
  const parsed = pappersResultSchema.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  return {
    siren: r.siren,
    legalName: r.nom_entreprise,
    nafLabel: r.libelle_code_naf ?? null,
    headcountRange: r.effectif ?? null,
    legalForm: r.forme_juridique ?? null,
    city: r.siege?.ville ?? null,
  };
}

/** Best-match lookup by company name; null when unconfigured, not found, or on error. */
export async function searchPappers(name: string): Promise<PappersCompanyData | null> {
  if (!isPappersConfigured()) return null;
  try {
    const url = new URL("https://api.pappers.fr/v2/recherche");
    url.searchParams.set("q", name);
    url.searchParams.set("api_token", process.env.PAPPERS_API_KEY!);
    url.searchParams.set("par_page", "1");
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const payload = (await response.json()) as { resultats?: unknown[] };
    return mapPappersResult(payload.resultats?.[0]);
  } catch {
    return null;
  }
}

const pappersEntrepriseSchema = z.object({ siren: z.string() });

export type SirenVerificationResult = "confirmed" | "not_found" | "unreachable";

/**
 * Confirms a SIREN exists in the Pappers registry at save time. Degrades to
 * "unreachable" (never blocks the save) on any provider hiccup — unconfigured,
 * network error, timeout, or an unusable response shape — consistent with how
 * the AI provider itself degrades when unavailable. Only a confirmed "the
 * registry has no such SIREN" (404) is treated as a rejection.
 */
export async function verifySirenAtPappers(siren: string): Promise<SirenVerificationResult> {
  if (!isPappersConfigured()) return "unreachable";
  try {
    const url = new URL("https://api.pappers.fr/v2/entreprise");
    url.searchParams.set("siren", siren);
    url.searchParams.set("api_token", process.env.PAPPERS_API_KEY!);
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (response.status === 404) return "not_found";
    if (!response.ok) return "unreachable";
    const payload = await response.json();
    return pappersEntrepriseSchema.safeParse(payload).success ? "confirmed" : "unreachable";
  } catch {
    return "unreachable";
  }
}
