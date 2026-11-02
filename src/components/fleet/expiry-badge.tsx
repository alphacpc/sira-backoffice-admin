import { StatusBadge } from "@/components/data/status-badge";
import { expiryBadge } from "@/lib/labels";
import type { ExpiryState } from "@/lib/repos/fleet";

/** Server Component: badge of a document expiry ("Expirée depuis 12 j", "Expire dans 15 j", "À jour"). */
export function ExpiryBadge({ state, daysLeft }: { state: ExpiryState; daysLeft: number }) {
  const b = expiryBadge(state, daysLeft);
  return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
}
