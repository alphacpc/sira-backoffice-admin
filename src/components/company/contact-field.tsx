"use client";

import { revealContact } from "@/app/(admin)/compagnies/actions";
import { MaskedValue } from "@/components/data/masked-value";

export function ContactField({
  companyId, field, value,
}: { companyId: string; field: "email" | "phone"; value: string }) {
  return <MaskedValue value={value} kind={field} onReveal={async () => {
    const r = await revealContact(companyId, field);
    if (!r.ok) throw new Error(r.error);
  }} />;
}
