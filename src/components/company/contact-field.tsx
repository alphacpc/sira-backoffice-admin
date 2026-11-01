"use client";

import { revealContact } from "@/app/(admin)/compagnies/actions";
import { MaskedValue } from "@/components/data/masked-value";

export function ContactField({
  companyId, field, masked,
}: { companyId: string; field: "email" | "phone"; masked: string }) {
  return <MaskedValue masked={masked} kind={field} reveal={async () => {
    const r = await revealContact(companyId, field);
    if (!r.ok) throw new Error(r.error);
    return r.value;
  }} />;
}
