"use client";

import { useRouter } from "next/navigation";
import { revealUserContact } from "@/app/(admin)/utilisateurs/actions";
import { MaskedValue } from "@/components/data/masked-value";

/**
 * Receives only the masked value; the real one comes from the journaled server action, on demand.
 * The refresh shows the new journal entry on the activity tab.
 */
export function UserContactField({
  userId, field, masked,
}: { userId: string; field: "email" | "phone"; masked: string }) {
  const router = useRouter();
  return <MaskedValue masked={masked} kind={field} reveal={async () => {
    const r = await revealUserContact(userId, field);
    if (!r.ok) throw new Error(r.error);
    router.refresh();
    return r.value;
  }} />;
}
