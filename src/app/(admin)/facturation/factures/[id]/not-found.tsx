import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function InvoiceNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Facture introuvable</p>
        <Link href="/facturation/factures" className="mt-2 inline-block text-sm text-accent underline">
          Retour aux factures
        </Link>
      </CardContent>
    </Card>
  );
}
