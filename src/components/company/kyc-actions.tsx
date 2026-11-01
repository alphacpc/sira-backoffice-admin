"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveDocument, rejectDocument } from "@/app/(admin)/compagnies/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

export function KycActions({ docId, docLabel }: { docId: string; docLabel: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    try {
      await approveDocument(docId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={approve} disabled={busy} aria-label={`Approuver ${docLabel}`}>Approuver</Button>
      <Button size="sm" variant="secondary" onClick={() => setRejecting(true)} aria-label={`Rejeter ${docLabel}`}>Rejeter</Button>
      <ConfirmDialog
        open={rejecting} onOpenChange={setRejecting}
        title={`Rejeter « ${docLabel} »`}
        description="Le motif sera conservé et visible dans l'historique."
        confirmLabel="Rejeter le document" destructive requireReason
        onConfirm={async (reason) => {
          await rejectDocument(docId, reason);
          router.refresh();
        }}
      />
    </div>
  );
}
