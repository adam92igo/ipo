const eurCompact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const eurFull = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** €12.5M — for chart labels and cards. */
export const formatEurCompact = (value: number) => eurCompact.format(value);

/** €12,500,000 — for tables and tooltips. */
export const formatEur = (value: number) => eurFull.format(value);
