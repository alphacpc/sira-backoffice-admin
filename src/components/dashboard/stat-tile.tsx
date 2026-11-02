import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE = {
  accent: "bg-accent-soft text-accent-text",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
} as const;

export function StatTile({
  label, value, hint, delta, icon: Icon, tone = "accent",
}: {
  label: string; value: string; hint?: string; delta?: number | null;
  icon: ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean }>; tone?: keyof typeof TONE;
}) {
  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", TONE[tone])}>
          <Icon size={20} weight="duotone" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {delta != null && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", delta >= 0 ? "text-success" : "text-danger")}>
            {delta >= 0 ? <ArrowUpRight size={12} aria-hidden /> : <ArrowDownRight size={12} aria-hidden />}
            {Math.abs(delta)} %
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </Card>
  );
}
