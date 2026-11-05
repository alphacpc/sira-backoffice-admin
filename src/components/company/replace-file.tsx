"use client";

import { ArrowsClockwise } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { replaceKycDocument } from "@/app/(admin)/compagnies/actions";
import { Button } from "@/components/ui/button";

/** Administrator only: the server action re-checks the account, hiding the button is not the protection. */
export function ReplaceFile({ docId, docLabel }: { docId: string; docLabel: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await replaceKycDocument(docId, fd);
      router.refresh();
      if (!r.ok) setError(r.error);
    } catch {
      setError("Action impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={onPick} aria-label={`Fichier de remplacement pour ${docLabel}`} />
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => input.current?.click()} aria-label={`Remplacer ${docLabel}`}>
        <ArrowsClockwise size={16} aria-hidden className="mr-1.5" />{busy ? "Envoi…" : "Remplacer"}
      </Button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
