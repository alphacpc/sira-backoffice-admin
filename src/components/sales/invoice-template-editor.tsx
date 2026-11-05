"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveInvoiceTemplate } from "@/app/(admin)/ventes/actions";
import { InvoiceSheet, type InvoiceSheetData } from "@/components/sales/invoice-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PALETTES, contrast, readableOn } from "@/lib/invoice-style";
import type { InvoiceTemplate } from "@/lib/types";

const MAX_LOGO = 300_000;
const AREA = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

export function InvoiceTemplateEditor({ companyId, initial, sample, qr }: { companyId: string; initial: InvoiceTemplate; sample: InvoiceSheetData; qr: string }) {
  const router = useRouter();
  const [t, setT] = useState<InvoiceTemplate>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof InvoiceTemplate>(k: K, v: InvoiceTemplate[K]) => { setT((x) => ({ ...x, [k]: v })); setMsg(null); };
  const ratio = contrast(t.primaryColor, readableOn(t.primaryColor) === "#ffffff" ? "#ffffff" : "#111827");

  function onLogo(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) { setMsg({ ok: false, text: "Choisissez une image PNG, JPEG, WebP ou SVG" }); return; }
    if (file.size > MAX_LOGO) { setMsg({ ok: false, text: "Le logo est trop lourd (300 Ko maximum)" }); return; }
    const reader = new FileReader();
    reader.onload = () => set("logoDataUrl", String(reader.result));
    reader.readAsDataURL(file);
  }
  async function save() {
    setBusy(true);
    const r = await saveInvoiceTemplate(companyId, t);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Modèle enregistré : toutes les factures de la compagnie l'utilisent." } : { ok: false, text: r.error });
    if (r.ok) router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <div className="space-y-5 print:hidden">
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Palette</legend>
          <div className="grid grid-cols-2 gap-2">
            {PALETTES.map((p) => (
              <button key={p.name} type="button" onClick={() => { set("primaryColor", p.primary); set("accentColor", p.accent); }}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left text-xs font-medium hover:bg-muted">
                <span className="flex"><span className="size-5 rounded-l-md" style={{ backgroundColor: p.primary }} /><span className="size-5 rounded-r-md" style={{ backgroundColor: p.accent }} /></span>{p.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="text-sm"><span className="mb-1 block text-muted-foreground">Couleur principale</span><Input type="color" value={t.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="p-1" /></label>
            <label className="text-sm"><span className="mb-1 block text-muted-foreground">Couleur d'accent</span><Input type="color" value={t.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="p-1" /></label>
          </div>
          {ratio < 4.5 && <p className="text-xs text-amber-700">Cette couleur principale donne un texte peu lisible sur l'en-tête.</p>}
        </fieldset>

        <div className="space-y-2">
          <label className="block text-sm font-semibold" htmlFor="logo">Logo</label>
          <input id="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => onLogo(e.target.files?.[0])} className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:py-2 file:text-sm file:font-medium" />
          <p className="text-xs text-muted-foreground">PNG, JPEG, WebP ou SVG, 300 Ko maximum. Sans logo, les initiales de la compagnie sont utilisées.</p>
          {t.logoDataUrl && <Button variant="ghost" size="sm" onClick={() => set("logoDataUrl", null)}>Retirer le logo</Button>}
        </div>

        <label className="block text-sm"><span className="mb-1 block font-semibold">Sous-titre de l'en-tête</span><Input maxLength={120} value={t.headerNote} onChange={(e) => set("headerNote", e.target.value)} placeholder="ex. Transport et location de bus" /></label>
        <label className="block text-sm"><span className="mb-1 block font-semibold">Message de pied de page</span><textarea rows={2} maxLength={300} className={AREA} value={t.footerNote} onChange={(e) => set("footerNote", e.target.value)} /></label>
        <label className="block text-sm"><span className="mb-1 block font-semibold">Mentions légales</span><textarea rows={3} maxLength={600} className={AREA} value={t.legalMentions} onChange={(e) => set("legalMentions", e.target.value)} placeholder="Capital, adresse du siège, coordonnées bancaires…" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm"><span className="mb-1 block font-semibold">TVA (%)</span><Input type="number" min={0} max={30} step={0.5} value={t.taxRate} onChange={(e) => set("taxRate", Number(e.target.value))} /></label>
          <label className="text-sm"><span className="mb-1 block font-semibold">Délai (jours)</span><Input type="number" min={0} max={90} value={t.paymentTermsDays} onChange={(e) => set("paymentTermsDays", Math.round(Number(e.target.value)))} /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={t.showQr} onChange={(e) => set("showQr", e.target.checked)} />Afficher le QR code de paiement</label>

        {msg && <p role={msg.ok ? "status" : "alert"} data-testid="template-message" className={msg.ok ? "rounded-lg bg-lime-100 px-3 py-2 text-sm font-medium text-lime-800" : "rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-800"}>{msg.text}</p>}
        <Button className="w-full" disabled={busy} onClick={() => void save()} data-testid="template-save">Enregistrer le modèle</Button>
      </div>
      <div className="min-w-0 rounded-2xl bg-muted/50 p-4 sm:p-6">
        <p className="mb-3 text-center text-xs text-muted-foreground print:hidden">Aperçu avec des données d'exemple</p>
        <InvoiceSheet data={sample} template={t} qr={qr} />
      </div>
    </div>
  );
}
