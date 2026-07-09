import { z } from "zod";

const amount = z.coerce.number().min(-1e12).max(1e12);

export const financialYearSchema = z
  .object({
    fiscalYear: z.coerce.number().int().min(1990).max(2100),
    revenue: amount.min(0).nullish(),
    ebitda: amount.nullish(),
    netIncome: amount.nullish(),
    netDebt: amount.nullish(),
    freeCashFlow: amount.nullish(),
  })
  .refine(
    (y) =>
      [y.revenue, y.ebitda, y.netIncome, y.netDebt, y.freeCashFlow].some(
        (v) => v !== null && v !== undefined,
      ),
    { message: "Provide at least one financial metric for the year" },
  );

export type FinancialYearInput = z.infer<typeof financialYearSchema>;
