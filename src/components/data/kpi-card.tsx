import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneClass = {
  default: "text-foreground", danger: "text-danger", warning: "text-warning", success: "text-success",
} as const;

export function KpiCard({
  label, value, hint, tone = "default",
}: { label: string; value: string | number; hint?: string; tone?: keyof typeof toneClass }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
