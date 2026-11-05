"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeSlash, EnvelopeSimple, LockKey, Warning } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { login } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  identifiant: z.string().min(1, "Identifiant requis"),
  motDePasse: z.string().min(1, "Mot de passe requis"),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const { register, handleSubmit, setValue, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setError(null);
    const res = await login(values);
    if (res.ok) router.push("/connexion/verification");
    else setError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="identifiant" className="text-sm font-semibold">Identifiant</label>
        <div className="relative">
          <EnvelopeSimple size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input id="identifiant" type="email" autoComplete="username" placeholder="prenom@sira.app" className="h-12 rounded-xl pl-11 text-base" aria-invalid={!!formState.errors.identifiant} {...register("identifiant")} />
        </div>
        {formState.errors.identifiant && <p className="text-xs font-medium text-danger">{formState.errors.identifiant.message}</p>}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="motDePasse" className="text-sm font-semibold">Mot de passe</label>
        <div className="relative">
          <LockKey size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input id="motDePasse" type={show ? "text" : "password"} autoComplete="current-password" className="h-12 rounded-xl pl-11 pr-12 text-base" aria-invalid={!!formState.errors.motDePasse} {...register("motDePasse")} />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Masquer la saisie" : "Afficher la saisie"} aria-pressed={show}
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-accent">
            {show ? <EyeSlash size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
        {formState.errors.motDePasse && <p className="text-xs font-medium text-danger">{formState.errors.motDePasse.message}</p>}
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-3 text-sm font-medium text-danger">
          <Warning size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0" />{error}
        </p>
      )}
      <Button type="submit" className="h-12 w-full rounded-xl text-base font-semibold" disabled={formState.isSubmitting}>
        Continuer<ArrowRight size={18} weight="bold" aria-hidden />
      </Button>
      <div className="rounded-xl border border-dashed border-border bg-muted/50 px-4 py-3 text-sm">
        <p className="font-semibold">Compte de démonstration</p>
        <p className="mt-0.5 text-muted-foreground">admin@sira.app · sira-demo, puis le code 123456.</p>
        <button type="button" className="mt-2 text-sm font-semibold text-accent-text hover:underline"
          onClick={() => { setValue("identifiant", "admin@sira.app", { shouldValidate: true }); setValue("motDePasse", "sira-demo", { shouldValidate: true }); }}>
          Remplir les champs
        </button>
      </div>
    </form>
  );
}
