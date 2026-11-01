import { buildSeed, type Store } from "@/lib/data/seed";

const g = globalThis as { __siraBackofficeStore?: Store };

/** Store partagé par processus ; survit au rechargement à chaud en dev. */
export function getStore(): Store {
  return (g.__siraBackofficeStore ??= buildSeed());
}

export function resetStore(): void {
  g.__siraBackofficeStore = buildSeed();
}
