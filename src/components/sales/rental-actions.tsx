"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignRental, cancelRental, completeRental, confirmRental, payRental, quoteRental } from "@/app/(admin)/ventes/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/actions/run";

export interface RentalActionsProps {
  rentalId: string; rentalCode: string; currency: string;
  nextActions: ("quote" | "assign" | "pay" | "confirm" | "complete" | "cancel")[];
  buses: { id: string; label: string; seats: number }[];
  drivers: { id: string; name: string }[];
  currentBusId: string | null; currentDriverId: string | null;
  /** Remaining balance, to prefill the payment. */
  balance: number;
}

const SELECT = "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

export function RentalActions(p: RentalActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [quote, setQuote] = useState("");
  const [pay, setPay] = useState(p.balance > 0 ? String(p.balance) : "");
  const [bus, setBus] = useState(p.currentBusId ?? "");
  const [driver, setDriver] = useState(p.currentDriverId ?? "");
  const has = (a: RentalActionsProps["nextActions"][number]) => p.nextActions.includes(a);

  async function go(fn: () => Promise<ActionResult>) {
    setBusy(true); setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) setError(r.error);
    router.refresh();
  }

  if (p.nextActions.length === 0) return <p className="text-sm text-muted-foreground">Cette location est clôturée : plus aucune action possible.</p>;
  return (
    <div className="space-y-5">
      {error && <p role="alert" data-testid="rental-error" className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-800 dark:bg-rose-400/15 dark:text-rose-300">{error}</p>}
      {has("quote") && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void go(() => quoteRental(p.rentalId, Number(quote))); }}>
          <label className="min-w-48 flex-1 text-sm"><span className="mb-1 block text-muted-foreground">Montant du devis ({p.currency})</span><Input inputMode="numeric" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="ex. 250000" required /></label>
          <Button type="submit" disabled={busy}>Envoyer le devis</Button>
        </form>
      )}
      {has("assign") && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void go(() => assignRental(p.rentalId, bus, driver)); }}>
          <label className="min-w-48 flex-1 text-sm"><span className="mb-1 block text-muted-foreground">Bus</span>
            <select className={SELECT} value={bus} onChange={(e) => setBus(e.target.value)} required>
              <option value="">Choisir un bus</option>{p.buses.map((b) => <option key={b.id} value={b.id}>{b.label} ({b.seats} places)</option>)}
            </select></label>
          <label className="min-w-48 flex-1 text-sm"><span className="mb-1 block text-muted-foreground">Chauffeur</span>
            <select className={SELECT} value={driver} onChange={(e) => setDriver(e.target.value)} required>
              <option value="">Choisir un chauffeur</option>{p.drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></label>
          <Button type="submit" variant="secondary" disabled={busy}>Affecter</Button>
        </form>
      )}
      {has("pay") && p.balance > 0 && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void go(() => payRental(p.rentalId, Number(pay))); }}>
          <label className="min-w-48 flex-1 text-sm"><span className="mb-1 block text-muted-foreground">Paiement reçu ({p.currency})</span><Input inputMode="numeric" value={pay} onChange={(e) => setPay(e.target.value)} required /></label>
          <Button type="submit" variant="secondary" disabled={busy}>Enregistrer le paiement</Button>
        </form>
      )}
      <div className="flex flex-wrap gap-3">
        {has("confirm") && <Button disabled={busy} onClick={() => void go(() => confirmRental(p.rentalId))}>Confirmer la location</Button>}
        {has("complete") && <Button disabled={busy} onClick={() => void go(() => completeRental(p.rentalId))}>Terminer la location</Button>}
        {has("cancel") && <Button variant="danger" disabled={busy} onClick={() => setCancelOpen(true)}>Annuler la location</Button>}
      </div>
      <ConfirmDialog
        open={cancelOpen} onOpenChange={setCancelOpen} title={`Annuler la location ${p.rentalCode}`}
        description="La location ne pourra plus être modifiée. Les paiements déjà reçus restent à rembourser hors de Sira."
        confirmLabel="Confirmer l'annulation" destructive requireReason
        onConfirm={async (reason) => { const r = await cancelRental(p.rentalId, reason); router.refresh(); if (!r.ok) throw new Error(r.error); }}
      />
    </div>
  );
}
