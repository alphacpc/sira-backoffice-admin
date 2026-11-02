import { cn } from "@/lib/utils";

export function CompanyAvatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[#ea580c] font-bold text-white",
        size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-12 text-base" : "size-9 text-sm",
        className,
      )}
    >
      {name.trim().slice(0, 2).toUpperCase()}
    </span>
  );
}
