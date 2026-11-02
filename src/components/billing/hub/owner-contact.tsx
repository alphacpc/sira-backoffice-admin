"use client";

import { Envelope, Phone } from "@phosphor-icons/react/dist/ssr";
import { revealOwnerContact } from "@/app/(admin)/facturation/actions";
import { MaskedValue } from "@/components/data/masked-value";

/** Masked e-mail or phone of the owner with an eye to reveal it (the reveal is logged). */
export function OwnerContact({ companyId, field, masked }: { companyId: string; field: "email" | "phone"; masked: string }) {
  const Icon = field === "email" ? Envelope : Phone;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon size={13} weight="duotone" aria-hidden className="shrink-0" />
      <MaskedValue masked={masked} kind={field} reveal={async () => {
        const r = await revealOwnerContact(companyId, field);
        if (!r.ok) throw new Error(r.error);
        return r.value;
      }} />
    </p>
  );
}
