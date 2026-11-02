"use client";

import { useState } from "react";
import { consultUserConsents } from "@/app/(admin)/conformite/actions";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { accessReasonLabel, consentSourceLabel, consentStatusBadge, consentTypeLabel } from "@/lib/labels";
import type { ConsentEntryView, ConsentUserOption } from "@/lib/repos/compliance";

const REASONS = ["SUPPORT_REQUEST", "LEGAL_OBLIGATION", "SERVICE_DELIVERY", "INVESTIGATION"] as const;

/** Only account ids and labels come in; the history comes from the journaled server action. */
export function ConsentLookup({ users }: { users: ConsentUserOption[] }) {
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("SUPPORT_REQUEST");
  const [entries, setEntries] = useState<ConsentEntryView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function consult() {
    setBusy(true);
    setError(null);
    const r = await consultUserConsents(userId, reason);
    setBusy(false);
    if (!r.ok) { setError(r.error); setEntries(null); return; }
    setEntries(r.value);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Utilisateur</span>
          <select
            aria-label="Utilisateur" value={userId} onChange={(e) => setUserId(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Motif d&apos;accès</span>
          <select
            aria-label="Motif d'accès" value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {REASONS.map((r) => <option key={r} value={r}>{accessReasonLabel(r)}</option>)}
          </select>
        </label>
        <Button size="sm" onClick={consult} disabled={busy || !userId}>Consulter</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        La consultation est enregistrée dans le journal d&apos;accès aux données, avec le motif choisi.
      </p>
      {error && <p role="alert" data-testid="consent-error" className="text-sm text-danger">{error}</p>}
      {entries && (
        <div className="overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Consentement</th>
                <th className="px-3 py-2 font-medium">Compagnie</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Version</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">État</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const badge = consentStatusBadge(e.status);
                return (
                  <tr key={e.id} data-testid="consent-entry" data-current={e.isCurrent ? "true" : "false"} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{formatDateTime(e.at)}</td>
                    <td className="px-3 py-2">{consentTypeLabel(e.consentType)}</td>
                    <td className="px-3 py-2">{e.companyName ?? "—"}</td>
                    <td className="px-3 py-2"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                    <td className="px-3 py-2">{e.consentVersion}</td>
                    <td className="px-3 py-2">{consentSourceLabel(e.source)}</td>
                    <td className="px-3 py-2">{e.isCurrent ? "Courant" : "Remplacé"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
