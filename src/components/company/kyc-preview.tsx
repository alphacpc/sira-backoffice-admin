"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { DownloadSimple, X } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export type KycFile = { kind: "pdf" | "image"; url: string; name: string };

/** Demo files only: the mock store keeps no uploaded file, so a sample PDF or image stands in. */
export function sampleFile(index: number, label: string): KycFile {
  return index % 2 === 0
    ? { kind: "pdf", url: "/kyc-samples/exemple.pdf", name: `${label}.pdf` }
    : { kind: "image", url: "/kyc-samples/exemple.svg", name: `${label}.svg` };
}

export function KycPreview({
  file, title, subtitle, onClose,
}: { file: KycFile | null; title: string; subtitle: string; onClose: () => void }) {
  return (
    <Dialog open={file !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="flex h-[88vh] max-w-5xl flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {file && (
              <a href={file.url} download={file.name} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-muted">
                <DownloadSimple size={18} aria-hidden />Télécharger
              </a>
            )}
            <RadixDialog.Close aria-label="Fermer" className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted">
              <X size={18} aria-hidden />
            </RadixDialog.Close>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-muted/50">
          {file?.kind === "pdf" && <iframe src={file.url} title={title} className="h-full w-full" />}
          {file?.kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.url} alt={title} className="mx-auto h-full max-w-full object-contain" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
