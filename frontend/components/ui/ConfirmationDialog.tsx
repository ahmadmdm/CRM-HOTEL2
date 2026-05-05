"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmationTone = "primary" | "danger";

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  isProcessing = false,
  tone = "primary",
  showCancel = true,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  isProcessing?: boolean;
  tone?: ConfirmationTone;
  showCancel?: boolean;
}) {
  const confirmButtonClassName =
    tone === "danger"
      ? "rounded-[20px] bg-gradient-to-r from-rose-600 via-rose-500 to-orange-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      : "primary-action disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isProcessing) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-[71] flex items-center justify-center p-4">
          <div className="modal-shell w-full max-w-xl">
            <div className="mb-4 flex items-start gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl",
                  tone === "danger"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-300"
                    : "bg-primary/10 text-primary"
                )}
              >
                {tone === "danger" ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">{title}</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-7 text-muted-foreground">
                  {description}
                </Dialog.Description>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              {showCancel && (
                <button type="button" onClick={onClose} disabled={isProcessing} className="secondary-action disabled:opacity-50">
                  {cancelLabel}
                </button>
              )}
              <button type="button" onClick={onConfirm} disabled={isProcessing} className={confirmButtonClassName}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}