import { z } from "zod";

export const companyInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  sector: z.string().trim().min(1, "Sector is required").max(100),
  country: z
    .string()
    .trim()
    .length(2, "ISO 3166-1 alpha-2 code expected")
    .transform((v) => v.toUpperCase())
    .default("FR"),
  website: z.union([z.url(), z.literal("")]).optional(),
  siren: z
    .union([z.string().regex(/^\d{9}$/, "SIREN is 9 digits"), z.literal("")])
    .optional(),
  headcount: z.coerce.number().int().positive().max(1_000_000).optional(),
});

export type CompanyInput = z.infer<typeof companyInputSchema>;
