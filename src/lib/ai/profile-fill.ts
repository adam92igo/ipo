import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AI_MODEL, getAnthropicClient } from "./config";
import { searchPappers, type PappersCompanyData } from "./pappers";
import { fetchWebsiteText } from "./website";

/**
 * "Fill with AI": pre-fills the company profile from the official website and
 * the Pappers registry ONLY. The result is a SUGGESTION the user reviews —
 * nothing is written to the database here.
 */

export const companyProfileSuggestionSchema = z.object({
  sector: z
    .string()
    .describe("Short English sector label, e.g. 'Industrial robotics'"),
  headcount: z
    .number()
    .int()
    .nullable()
    .describe("Best single estimate of employee count, null if unknown"),
  siren: z
    .string()
    .nullable()
    .describe("9-digit French SIREN if known, else null"),
  website: z.string().nullable().describe("Official website URL if confirmed"),
  summary: z
    .string()
    .describe("2-3 sentence factual description of the company's activity"),
  sources: z
    .array(z.enum(["registry", "website"]))
    .describe("Which provided sources actually supported the answer"),
});

export type CompanyProfileSuggestion = z.infer<typeof companyProfileSuggestionSchema>;

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

  const client = getAnthropicClient();
  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: buildProfileFillPrompt({
          name,
          website: website ?? null,
          pappers,
          websiteText,
        }),
      },
    ],
    output_config: {
      format: zodOutputFormat(companyProfileSuggestionSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("The model did not return a usable profile suggestion");
  }
  return {
    suggestion: response.parsed_output,
    usedRegistry: pappers !== null,
    usedWebsite: websiteText !== null,
  };
}
