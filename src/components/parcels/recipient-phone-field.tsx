"use client";

import { useRouter } from "next/navigation";
import { revealParcelRecipientPhone } from "@/app/(admin)/colis/actions";
import { MaskedValue } from "@/components/data/masked-value";

/** Receives only the masked number; the real one comes from the journaled server action, on demand. */
export function RecipientPhoneField({ parcelId, masked }: { parcelId: string; masked: string }) {
  const router = useRouter();
  return (
    <MaskedValue masked={masked} kind="phone" reveal={async () => {
      const r = await revealParcelRecipientPhone(parcelId);
      if (!r.ok) throw new Error(r.error);
      router.refresh();
      return r.value;
    }} />
  );
}
