import { generateCompanyProfileSuggestion } from "./model";
import { searchPappers, type PappersCompanyData } from "./pappers";
import {
  companyProfileSuggestionSchema,
  type CompanyProfileSuggestion,
} from "./profile-schema";
import { fetchWebsiteText } from "./website";

/**
 * "Fill with AI": pre-fills the company profile from the official website and
 * the Pappers registry ONLY. The result is a SUGGESTION the user reviews —
 * nothing is written to the database here.
 */

export { companyProfileSuggestionSchema, type CompanyProfileSuggestion };

/** Pure prompt builder (unit-tested). */
export function buildProfileFillPrompt({
  name,
  website,
  pappers,
  websiteText,
}: {
  name: string;
  website: string | null;
  pappers: PappersCompanyData | null;
  websiteText: string | null;
}): string {
  const registryBlock = pappers
    ? [
        `Legal name: ${pappers.legalName}`,
        `SIREN: ${pappers.siren}`,
        pappers.nafLabel && `Activity (NAF): ${pappers.nafLabel}`,
        pappers.headcountRange && `Headcount range: ${pappers.headcountRange}`,
        pappers.legalForm && `Legal form: ${pappers.legalForm}`,
        pappers.city && `Headquarters: ${pappers.city}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "No registry data available.";

  const websiteBlock = websiteText
    ? websiteText
    : "No website content available.";

  return [
    `Fill the company profile for "${name}"${website ? ` (website: ${website})` : ""}.`,
    "",
    "Use ONLY the two sources below — no outside knowledge, no guessing beyond",
    "reasonable inference from them (e.g. a single headcount estimate from a",
    "range). Set a field to null when the sources do not support it.",
    "",
    "=== SOURCE 1: French company registry (Pappers) ===",
    registryBlock,
    "",
    "=== SOURCE 2: official website content ===",
    websiteBlock,
  ].join("\n");
}

export interface ProfileFillResult {
  suggestion: CompanyProfileSuggestion;
  usedRegistry: boolean;
  usedWebsite: boolean;
}

export async function fillCompanyProfile({
  name,
  website,
}: {
  name: string;
  website: string | null;
}): Promise<ProfileFillResult> {
  const [pappers, websiteText] = await Promise.all([
    searchPappers(name),
    website ? fetchWebsiteText(website) : Promise.resolve(null),
  ]);

  const suggestion = await generateCompanyProfileSuggestion(
    buildProfileFillPrompt({
      name,
      website: website ?? null,
      pappers,
      websiteText,
    }),
  );
  return {
    suggestion,
    usedRegistry: pappers !== null,
    usedWebsite: websiteText !== null,
  };
}
