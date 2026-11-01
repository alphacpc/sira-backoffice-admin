"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { maskEmail, maskPhone } from "@/lib/mask";

export function MaskedValue({
  value, kind, onReveal,
}: { value: string; kind: "email" | "phone"; onReveal?: () => void | Promise<void> }) {
  const [shown, setShown] = useState(false);

  async function toggle() {
    if (!shown) await onReveal?.();
    setShown((s) => !s);
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
    </span>
  );
}
