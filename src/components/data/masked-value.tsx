"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { maskEmail, maskPhone } from "@/lib/mask";

export function MaskedValue({
  value, kind, onReveal,
}: { value: string; kind: "email" | "phone"; onReveal?: () => void | Promise<void> }) {
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    if (busy) return;
    if (shown) { setShown(false); return; }
    setBusy(true);
    setFailed(false);
    try {
      await onReveal?.();
      setShown(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span data-testid={`masked-${kind}`}>
        {shown ? value : kind === "email" ? maskEmail(value) : maskPhone(value)}
      </span>
      <button
        type="button" onClick={toggle}
        aria-label={shown ? "Masquer la donnée" : "Révéler la donnée"}
        className="text-muted-foreground hover:text-foreground"
      >
        {shown ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      {failed && <span role="alert" className="text-xs text-danger">Impossible de révéler</span>}
    </span>
  );
}
