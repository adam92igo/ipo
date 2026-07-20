import { z } from "zod";

const shareCount = z.coerce
  .number()
  .int("un nombre entier d'actions est attendu")
  .max(1e15);

export const shareStructureSchema = z.object({
  existingShares: shareCount.positive("le nombre d'actions existantes doit être positif"),
  newShares: shareCount.min(0, "le nombre de nouvelles actions ne peut pas être négatif").default(0),
});

export type ShareStructureInput = z.infer<typeof shareStructureSchema>;
