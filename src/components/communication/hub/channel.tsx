import { Bell, ChatText, DeviceMobile, Envelope, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import type { NotificationChannel } from "@/lib/types";
import { cn } from "@/lib/utils";

export const CHANNEL: Record<NotificationChannel, { label: string; icon: ComponentType<{ size?: number; weight?: "duotone" | "fill"; "aria-hidden"?: boolean; className?: string }>; tile: string }> = {
  EMAIL: { label: "E-mail", icon: Envelope, tile: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300" },
  SMS: { label: "SMS", icon: ChatText, tile: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300" },
  IN_APP: { label: "Dans l'application", icon: Bell, tile: "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300" },
  PUSH: { label: "Notification push", icon: DeviceMobile, tile: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" },
  WHATSAPP: { label: "WhatsApp", icon: WhatsappLogo, tile: "bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300" },
};

export function ChannelChip({ channel, compact = false }: { channel: NotificationChannel; compact?: boolean }) {
  const c = CHANNEL[channel];
  return (
    <span className="inline-flex items-center gap-2 font-medium">
      <span className={cn("flex shrink-0 items-center justify-center rounded-lg", c.tile, compact ? "size-7" : "size-8")}><c.icon size={compact ? 15 : 17} weight="duotone" aria-hidden /></span>
      {c.label}
    </span>
  );
}
