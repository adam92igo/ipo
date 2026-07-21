import { z } from "zod";
import type { PeerCompany } from "@/engines/benchmark/types";
import peerCompaniesV1 from "../../config/peer-companies.v1.json";
import { createVersionedConfig } from "./versioned-config";

const peerSchema = z.object({
  name: z.string().min(1),
  market: z.string().min(1),
  evEbitda: z.number().positive().nullable(),
  evRevenue: z.number().positive().nullable(),
  note: z.string().min(1),
});

const sectorPeersSchema = z.object({ peers: z.array(peerSchema) });

export const peerCompaniesSchema = z
  .object({
    version: z.string().min(1),
    note: z.string(),
    asOf: z.string().min(1),
    sectors: z.record(z.string(), sectorPeersSchema),
  })
  .refine((c) => "default" in c.sectors, {
    message: "a `default` peer set is required",
  });

export interface PeerCompaniesFile {
  version: string;
  note: string;
  asOf: string;
  sectors: Record<string, { peers: PeerCompany[] }>;
}

export const CURRENT_PEER_COMPANIES_VERSION = "v1";

export const getPeerCompaniesFile = createVersionedConfig<PeerCompaniesFile>(
  "peer companies",
  { v1: peerCompaniesV1 },
  peerCompaniesSchema,
);

/**
 * Peers for a sector key (the same key the valuation engine matched), falling
 * back to the `default` set. Deterministic; version-pinned like every config.
 */
export function getPeersForSector(
  sectorKey: string,
  version: string = CURRENT_PEER_COMPANIES_VERSION,
): PeerCompany[] {
  const file = getPeerCompaniesFile(version);
  return (file.sectors[sectorKey] ?? file.sectors.default).peers;
}
