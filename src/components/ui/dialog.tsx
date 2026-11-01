"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Dialog = RadixDialog.Root;

export function DialogContent({
  className, children, ...props
}: React.ComponentPropsWithoutRef<typeof RadixDialog.Content>) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-card p-6 shadow-card",
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogTitle(props: React.ComponentPropsWithoutRef<typeof RadixDialog.Title>) {
  return <RadixDialog.Title className="text-lg font-semibold" {...props} />;
}

export function DialogDescription(props: React.ComponentPropsWithoutRef<typeof RadixDialog.Description>) {
  return <RadixDialog.Description className="mt-1 text-sm text-muted-foreground" {...props} />;
}
