import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/data/page-header";
import { InvoiceTemplateEditor } from "@/components/sales/invoice-template-editor";
import { qrFor, sampleInvoiceFor, templateOf } from "@/lib/repos/rental-invoices";
import { getStore } from "@/lib/repos/store";

export const dynamic = "force-dynamic";

export default async function InvoiceTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = getStore().companies.find((c) => c.id === id);
  if (!company) notFound();
  const template = templateOf(id);
  const sample = sampleInvoiceFor(id, template);
  const qr = await qrFor(sample.payLink, template.primaryColor);
  return (
    <>
      <PageHeader title="Modèle de facture" description={`Logo, couleurs et textes des factures de ${company.name}.`} />
      <p className="mb-5 text-sm text-muted-foreground">
        <Link href={`/compagnies/${id}`} className="font-medium text-accent-text hover:underline">← Retour à la compagnie</Link>
      </p>
      <InvoiceTemplateEditor companyId={id} initial={template} sample={sample} qr={qr} />
    </>
  );
}
