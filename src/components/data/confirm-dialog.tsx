"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  requireReason?: boolean;
  /** Extra fields rendered above the reason (for example a select); `confirmDisabled` gates them. */
  children?: React.ReactNode;
  confirmDisabled?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, destructive, requireReason, children,
  confirmDisabled, onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const missing = requireReason && reason.trim().length === 0;

  useEffect(() => {
    if (!open) { setReason(""); setError(null); }
  }, [open]);

  function handleOpenChange(o: boolean) {
    if (busy && !o) return;
    if (!o) { setReason(""); setError(null); }
    onOpenChange(o);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        {children && <div className="mt-4 space-y-1">{children}</div>}
        {requireReason && (
          <div className="mt-4 space-y-1">
            <label htmlFor="reason" className="text-sm font-medium">Motif (obligatoire)</label>
            <textarea
              id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-card p-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
            />
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={confirm} disabled={busy || !!missing || !!confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
