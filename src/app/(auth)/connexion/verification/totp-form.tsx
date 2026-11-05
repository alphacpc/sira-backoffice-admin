"use client";

import { ArrowRight, Warning } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { verifyTotp } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TotpForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await verifyTotp(code);
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else setError(res.error);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="code" className="text-sm font-semibold">Code à 6 chiffres</label>
        <Input
          id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" autoFocus
          className="h-16 rounded-xl text-center font-mono text-3xl font-bold tracking-[0.5em] placeholder:tracking-[0.5em]"
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-3 text-sm font-medium text-danger">
          <Warning size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0" />{error}
        </p>
      )}
      <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold" disabled={busy || code.length !== 6}>
        Valider<ArrowRight size={18} weight="bold" aria-hidden />
      </Button>
    </form>
  );
}
