import { z } from "zod";

const shareCount = z.coerce
  .number()
  .int("a whole number of shares is expected")
  .max(1e15);

export const shareStructureSchema = z.object({
  existingShares: shareCount.positive("the number of existing shares must be positive"),
  newShares: shareCount.min(0, "the number of new shares cannot be negative").default(0),
});

export type ShareStructureInput = z.infer<typeof shareStructureSchema>;
