import { buildSeed, type Store } from "@/lib/data/seed";

const g = globalThis as { __siraBackofficeStore?: Store };

/** Store partagé par processus ; survit au rechargement à chaud en dev. */
export function getStore(): Store {
  return (g.__siraBackofficeStore ??= buildSeed());
}

/** Rebuilds the seed; tests pass a fixed date so day counts are deterministic. */
export function resetStore(now?: Date): void {
  g.__siraBackofficeStore = buildSeed(now);
}
