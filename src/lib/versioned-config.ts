/**
 * Shared loader for versioned business-content files (config/*.v*.json):
 * validates once per version, then serves the cached parse. Content is
 * immutable per version — see config-immutability.test.ts.
 */
export function createVersionedConfig<T>(
  label: string,
  registry: Record<string, unknown>,
  schema: { parse(input: unknown): unknown },
): (version: string) => T {
  const cache = new Map<string, T>();
  return (version: string): T => {
    const cached = cache.get(version);
    if (cached) return cached;
    const raw = registry[version];
    if (!raw) throw new Error(`Unknown ${label} version: ${version}`);
    const parsed = schema.parse(raw) as T;
    cache.set(version, parsed);
    return parsed;
  };
}
