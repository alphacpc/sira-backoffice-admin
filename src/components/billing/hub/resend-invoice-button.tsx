"use client";

import { CheckCircle, ChatText, Envelope, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resendInvoiceToOwner } from "@/app/(admin)/facturation/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatMoney } from "@/lib/format";
import type { PlanInvoiceRow } from "@/lib/repos/billing-hub";
import { cn } from "@/lib/utils";

type Channel = "EMAIL" | "SMS";

export function ResendInvoiceButton({ row }: { row: PlanInvoiceRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await resendInvoiceToOwner(row.id, channel);
      if (!r.ok) { setError(r.error); return; }
      setSent(true);
      router.refresh();
    } catch {
      setError("Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    // The dialog is rendered in a portal: keep its clicks away from anything wrapping the table cell.
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button" disabled={!row.ownerName} aria-label={`Renvoyer la facture ${row.number}`}
        onClick={() => { setChannel("EMAIL"); setError(null); setSent(false); setOpen(true); }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
      >
        <PaperPlaneTilt size={16} weight="duotone" aria-hidden /> Renvoyer
      </button>
      {row.lastSentAt && <p className="mt-1 text-center text-xs text-muted-foreground">Envoyée le {formatDate(row.lastSentAt)}</p>}

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent className="max-w-md">
          {sent ? (
            <div className="py-6 text-center">
              <CheckCircle size={48} weight="fill" aria-hidden className="mx-auto text-lime-500" />
              <DialogTitle>Facture renvoyée</DialogTitle>
              <DialogDescription>{row.number} a été envoyée à {row.ownerName} par {channel === "EMAIL" ? "e-mail" : "SMS"}.</DialogDescription>
              <Button className="mt-5" onClick={() => setOpen(false)}>Fermer</Button>
            </div>
          ) : (
            <>
              <DialogTitle>Renvoyer la facture {row.number}</DialogTitle>
              <DialogDescription>{row.companyName} · {formatMoney(row.amount, row.currency)}</DialogDescription>

              <div className="mt-5 rounded-xl bg-muted/70 p-4 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Destinataire</p>
                <p className="mt-1 font-semibold">{row.ownerName}</p>
                {row.ownerEmail && <p className="text-muted-foreground">{row.ownerEmail}</p>}
              </div>

              <fieldset className="mt-4">
                <legend className="mb-2 text-sm font-medium">Envoyer par</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([["EMAIL", "E-mail", Envelope], ["SMS", "SMS (lien)", ChatText]] as const).map(([value, label, Icon]) => (
                    <button
                      key={value} type="button" role="radio" aria-checked={channel === value} onClick={() => setChannel(value)}
                      className={cn("flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                        channel === value ? "border-accent bg-accent-soft" : "border-border hover:bg-muted")}
                    >
                      <Icon size={18} weight="duotone" aria-hidden /> {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
                <Button onClick={send} disabled={busy}><PaperPlaneTilt size={16} weight="duotone" aria-hidden /> Envoyer</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
