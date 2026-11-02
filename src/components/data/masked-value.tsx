"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

export function MaskedValue({
  masked, kind, reveal,
}: { masked: string; kind: "email" | "phone"; reveal?: () => Promise<string> }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    if (busy) return;
    if (revealed !== null) { setRevealed(null); return; }
    if (!reveal) return;
    setBusy(true);
    setFailed(false);
    try {
      setRevealed(await reveal());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const shown = revealed !== null;
  return (
    <span className="inline-flex items-center gap-2">
      <span data-testid={`masked-${kind}`}>{shown ? revealed : masked}</span>
      <button
        type="button" onClick={toggle}
        aria-label={shown ? "Masquer la donnée" : "Révéler la donnée"}
        className="text-muted-foreground hover:text-foreground"
      >
        {shown ? <EyeSlash size={14} /> : <Eye size={14} />}
      </button>
      {failed && <span role="alert" className="text-xs text-danger">Impossible de révéler</span>}
    </span>
  );
}
