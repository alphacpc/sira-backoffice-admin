"use client";

import { BellRinging, CheckCircle, Envelope, ChatText } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { remindSubscriptionOwner } from "@/app/(admin)/facturation/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatMoney } from "@/lib/format";
import type { OwnerSubscriptionRow } from "@/lib/repos/billing-hub";

export type ReminderTarget = Pick<OwnerSubscriptionRow, "id" | "status" | "planName" | "price" | "currency" | "nextBillingDate" | "ownerName" | "companyName" | "lastReminderAt">;
import { cn } from "@/lib/utils";

type Channel = "EMAIL" | "SMS";

function template(r: ReminderTarget): string {
  const hello = `Bonjour ${r.ownerName ?? ""},`.replace(" ,", ",");
  const price = formatMoney(r.price, r.currency);
  if (r.status === "past_due" || r.status === "suspended") {
    return `${hello} le paiement de votre abonnement ${r.planName} (${price}) est en attente. Merci de le régulariser pour éviter ${r.status === "suspended" ? "l'expiration" : "la suspension"} de votre compte Sira.`;
  }
  return `${hello} votre abonnement ${r.planName} (${price}) sera renouvelé le ${formatDate(r.nextBillingDate)}. Pensez à vérifier votre moyen de paiement.`;
}

export function ReminderButton({ row, label = "Relancer", variant }: { row: ReminderTarget; label?: string; variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const urgent = row.status === "past_due" || row.status === "suspended";
  const blocked = row.status === "canceled" || row.status === "expired" || !row.ownerName;

  function openDialog() {
    setMessage(template(row));
    setChannel("EMAIL");
    setError(null);
    setSent(false);
    setOpen(true);
  }

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await remindSubscriptionOwner(row.id, channel, message);
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
    // Clicks inside the dialog (rendered in a portal) must not reach the table row, which opens the subscription.
    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant={variant ?? (urgent ? "primary" : "secondary")} onClick={openDialog} disabled={blocked} aria-label={`Relancer ${row.ownerName ?? row.companyName}`}>
        <BellRinging size={16} weight="duotone" aria-hidden /> {label}
      </Button>
      {row.lastReminderAt && <p className="text-xs text-muted-foreground">Relancé le {formatDate(row.lastReminderAt)}</p>}

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
        <DialogContent className="max-w-lg">
          {sent ? (
            <div className="py-6 text-center">
              <CheckCircle size={48} weight="fill" aria-hidden className="mx-auto text-lime-500" />
              <DialogTitle>Relance envoyée</DialogTitle>
              <DialogDescription>{row.ownerName} a été relancé par {channel === "EMAIL" ? "e-mail" : "SMS"}.</DialogDescription>
              <Button className="mt-5" onClick={() => setOpen(false)}>Fermer</Button>
            </div>
          ) : (
            <>
              <DialogTitle>Relancer {row.ownerName}</DialogTitle>
              <DialogDescription>{row.companyName} · abonnement {row.planName}</DialogDescription>

              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-medium">Canal</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([["EMAIL", "E-mail", Envelope], ["SMS", "SMS", ChatText]] as const).map(([value, label, Icon]) => (
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

              <div className="mt-4 space-y-1">
                <label htmlFor="reminder-message" className="text-sm font-medium">Message</label>
                <textarea
                  id="reminder-message" rows={5} value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
                <p className="text-right text-xs tabular-nums text-muted-foreground">{message.length} / 500</p>
              </div>
              {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
                <Button onClick={send} disabled={busy || message.trim() === ""}>
                  <BellRinging size={16} weight="duotone" aria-hidden /> Envoyer la relance
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
