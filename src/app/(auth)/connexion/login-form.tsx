"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setError(null);
    const res = await login(values);
    if (res.ok) router.push("/connexion/verification");
    else setError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="identifiant" className="text-sm font-medium">Identifiant</label>
        <Input id="identifiant" type="email" autoComplete="username" {...register("identifiant")} />
        {formState.errors.identifiant && (
          <p className="text-xs text-danger">{formState.errors.identifiant.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="motDePasse" className="text-sm font-medium">Mot de passe</label>
        <Input id="motDePasse" type="password" autoComplete="current-password" {...register("motDePasse")} />
        {formState.errors.motDePasse && (
          <p className="text-xs text-danger">{formState.errors.motDePasse.message}</p>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        Continuer
      </Button>
    </form>
  );
}
