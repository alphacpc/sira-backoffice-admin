import Link from "next/link";
import { notFound } from "next/navigation";
import { isLive } from "@/lib/api/config";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { InvoiceActions } from "@/components/sales/invoice-actions";
import { InvoiceSheet } from "@/components/sales/invoice-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { INVOICE_STATUS, qrFor, rentalInvoicesRepo, toSheetData } from "@/lib/repos/rental-invoices";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  // Not wired to the platform yet: never look a live id up in the demonstration store.
  if (isLive()) notFound();
  const inv = rentalInvoicesRepo.byNumber(decodeURIComponent(number));
  if (!inv) notFound();
  const st = INVOICE_STATUS[inv.status];
  const qr = inv.balance > 0 && inv.template.showQr ? await qrFor(inv.payLink, inv.template.primaryColor) : null;
  const canPay = inv.balance > 0 && inv.status !== "CANCELLED";
  return (
    <>
      <PageHeader
        title={`Facture ${inv.number}`} description={`${inv.customer.name} · ${inv.issuer.name}`}
        actions={<span data-testid="invoice-status"><StatusBadge tone={st.tone}>{st.label}</StatusBadge></span>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 rounded-2xl bg-muted/50 p-4 sm:p-6 print:bg-transparent print:p-0">
          <InvoiceSheet data={toSheetData(inv)} template={inv.template} qr={qr} />
        </div>
        <aside className="space-y-4 print:hidden">
          <Card>
            <CardHeader><CardTitle>Règlement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <InvoiceActions
                number={inv.number} payLink={inv.payLink} canPay={canPay} balanceLabel={formatMoney(inv.balance, inv.currency)}
                templateHref={`/compagnies/${inv.companyId}/modele-facture`}
              />
              <p className="border-t border-border pt-3 text-sm text-muted-foreground">
                Location liée : <Link href={`/ventes/locations/${inv.rentalId}`} className="font-medium text-foreground hover:underline">{inv.rentalCode}</Link>
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
