import { formatDate, formatMoney } from "@/lib/format";
import { readableOn } from "@/lib/invoice-style";
import type { InvoiceTemplate } from "@/lib/types";

/** What the sheet needs; plain data so the editor can preview it on the client. */
export interface InvoiceSheetData {
  number: string; rentalCode: string; currency: string;
  issuer: { name: string; lines: string[]; ninea: string; registration: string };
  customer: { name: string; lines: string[] };
  lines: { label: string; detail: string; amount: number }[];
  subtotal: number; taxRate: number; taxAmount: number; total: number; paid: number; balance: number; cautionAmount: number;
  issuedAt: string; dueAt: string; statusLabel: string; payLink: string;
}

/** A4-style invoice. Colours, logo and texts come from the company template; everything else is fixed so invoices stay uniform. */
export function InvoiceSheet({ data, template, qr }: { data: InvoiceSheetData; template: InvoiceTemplate; qr: string | null }) {
  const { primaryColor: primary, accentColor: accent } = template;
  const onPrimary = readableOn(primary);
  const money = (n: number) => formatMoney(n, data.currency);
  const paid = data.balance === 0 && data.total > 0;
  return (
    <article
      data-testid="invoice-sheet" aria-label={`Facture ${data.number}`}
      className="mx-auto w-full max-w-[820px] overflow-hidden rounded-xl bg-white text-[#111827] shadow-card print:max-w-none print:rounded-none print:shadow-none"
    >
      <header className="flex items-start justify-between gap-6 px-10 py-8" style={{ backgroundColor: primary, color: onPrimary }}>
        <div className="flex items-center gap-4">
          {template.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={template.logoDataUrl} alt={`Logo ${data.issuer.name}`} className="size-16 rounded-lg bg-white object-contain p-1" />
          ) : (
            <span aria-hidden className="flex size-16 items-center justify-center rounded-lg text-2xl font-extrabold" style={{ backgroundColor: accent, color: readableOn(accent) }}>
              {data.issuer.name.trim().slice(0, 2).toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-xl font-extrabold leading-tight">{data.issuer.name}</p>
            {template.headerNote && <p className="mt-0.5 text-sm opacity-80">{template.headerNote}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold tracking-tight">Facture</p>
          <p className="mt-1 font-mono text-sm opacity-90">{data.number}</p>
        </div>
      </header>
      <div className="h-1.5" style={{ backgroundColor: accent }} />

      <div className="grid gap-8 px-10 py-8 sm:grid-cols-3">
        <div>
          <h2 className="text-xs font-bold" style={{ color: primary }}>Émise par</h2>
          <p className="mt-1.5 font-semibold">{data.issuer.name}</p>
          {data.issuer.lines.map((l) => <p key={l} className="text-sm text-[#4b5563]">{l}</p>)}
        </div>
        <div>
          <h2 className="text-xs font-bold" style={{ color: primary }}>Facturée à</h2>
          <p className="mt-1.5 font-semibold">{data.customer.name}</p>
          {data.customer.lines.map((l) => <p key={l} className="text-sm text-[#4b5563]">{l}</p>)}
        </div>
        <dl className="space-y-1.5 text-sm">
          {([["Date d'émission", formatDate(data.issuedAt)], ["Échéance", formatDate(data.dueAt)], ["Location", data.rentalCode]] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3"><dt className="text-[#6b7280]">{k}</dt><dd className="font-semibold">{v}</dd></div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#6b7280]">Statut</dt>
            <dd><span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: paid ? "#dcfce7" : accent + "33", color: paid ? "#166534" : "#111827" }}>{data.statusLabel}</span></dd>
          </div>
        </dl>
      </div>

      <div className="px-10">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `2px solid ${primary}`, color: primary }}>
              <th className="py-2 text-left text-xs font-bold">Désignation</th>
              <th className="py-2 text-right text-xs font-bold">Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l) => (
              <tr key={l.label} className="border-b border-[#e5e7eb] align-top">
                <td className="py-4 pr-6"><p className="font-semibold">{l.label}</p><p className="mt-0.5 text-[#6b7280]">{l.detail}</p></td>
                <td className="py-4 text-right font-semibold tabular-nums">{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-5 ml-auto w-full max-w-xs space-y-1.5 text-sm">
          {data.taxRate > 0 && (
            <>
              <div className="flex justify-between"><span className="text-[#6b7280]">Sous-total HT</span><span className="tabular-nums">{money(data.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-[#6b7280]">TVA {data.taxRate} %</span><span className="tabular-nums">{money(data.taxAmount)}</span></div>
            </>
          )}
          <div className="flex justify-between rounded-lg px-3 py-2 text-base font-extrabold" style={{ backgroundColor: primary, color: onPrimary }}>
            <span>Total {data.taxRate > 0 ? "TTC" : ""}</span><span className="tabular-nums" data-testid="invoice-total">{money(data.total)}</span>
          </div>
          {data.paid > 0 && <div className="flex justify-between px-3"><span className="text-[#6b7280]">Déjà réglé</span><span className="tabular-nums">− {money(data.paid)}</span></div>}
          <div className="flex justify-between px-3 text-base font-extrabold" style={{ color: primary }}>
            <span>Reste à payer</span><span className="tabular-nums" data-testid="invoice-balance">{money(data.balance)}</span>
          </div>
        </div>
        {data.cautionAmount > 0 && (
          <p className="mt-4 text-xs text-[#6b7280]">Une caution remboursable de {money(data.cautionAmount)} est demandée au départ. Elle ne fait pas partie du total ci-dessus.</p>
        )}
      </div>

      {data.balance > 0 && (
        <section className="mx-10 mt-8 flex items-center gap-6 rounded-xl border-2 border-dashed p-5" style={{ borderColor: accent }}>
          {template.showQr && qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code de paiement" className="size-28 shrink-0 rounded-lg border border-[#e5e7eb]" />
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold" style={{ color: primary }}>Payer cette facture en ligne</h2>
            <p className="mt-1 text-sm text-[#4b5563]">Scannez le code ou ouvrez le lien ci-dessous : mobile money ou carte bancaire.</p>
            <p className="mt-2 break-all rounded-md bg-[#f3f4f6] px-3 py-1.5 font-mono text-xs" data-testid="invoice-link">{data.payLink}</p>
          </div>
        </section>
      )}

      <footer className="mt-8 border-t border-[#e5e7eb] px-10 py-6 text-center text-xs text-[#6b7280]">
        {template.footerNote && <p className="text-sm font-medium text-[#374151]">{template.footerNote}</p>}
        {template.legalMentions && <p className="mt-2 whitespace-pre-line">{template.legalMentions}</p>}
        {!template.legalMentions && <p className="mt-2">NINEA {data.issuer.ninea} · RC {data.issuer.registration}</p>}
      </footer>
    </article>
  );
}
