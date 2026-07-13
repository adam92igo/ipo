import { z } from "zod";

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
