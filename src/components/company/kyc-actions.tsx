"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveDocument, rejectDocument } from "@/app/(admin)/compagnies/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

export function KycActions({ docId, docLabel, companyId }: { docId: string; docLabel: string; companyId: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const result = await approveDocument(docId, companyId);
      router.refresh();
      if (!result.ok) setError(result.error);
    } catch {
      setError("Action impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={approve} disabled={busy} aria-label={`Approuver ${docLabel}`}>Approuver</Button>
      <Button size="sm" variant="secondary" onClick={() => setRejecting(true)} aria-label={`Rejeter ${docLabel}`}>Rejeter</Button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <ConfirmDialog
        open={rejecting} onOpenChange={setRejecting}
        title={`Rejeter « ${docLabel} »`}
        description="Le motif sera conservé et visible dans l'historique."
        confirmLabel="Rejeter le document" destructive requireReason
        onConfirm={async (reason) => {
          const result = await rejectDocument(docId, reason, companyId);
          router.refresh();
          if (!result.ok) throw new Error(result.error);
        }}
      />
    </div>
  );
}
