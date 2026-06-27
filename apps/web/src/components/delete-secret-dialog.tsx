"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useDeleteSecret } from "../hooks/use-secrets";
import type { Secret } from "../lib/schema";
import { buttonClasses, dialogClasses } from "./style-tokens";

interface Props {
  secret: Secret | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSecretDialog({ secret, onOpenChange }: Props) {
  const deleteSecret = useDeleteSecret();

  async function confirm() {
    if (!secret) return;
    await deleteSecret.mutateAsync(secret.id);
    onOpenChange(false);
  }

  return (
    <AlertDialog.Root open={secret !== null} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={dialogClasses.overlay} />
        <AlertDialog.Content
          className={dialogClasses.panel.replace("max-w-xl", "max-w-lg")}
        >
          <AlertDialog.Title className={dialogClasses.title}>Delete secret</AlertDialog.Title>
          <AlertDialog.Description className={dialogClasses.description}>
            Delete "{secret?.name}"? This removes the row from the Sheet and cannot be undone.
          </AlertDialog.Description>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <button type="button" className={`${buttonClasses.secondary} w-full sm:w-auto`}>
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              onClick={confirm}
              disabled={deleteSecret.isPending}
              className={`${buttonClasses.danger} w-full sm:w-auto`}
            >
              {deleteSecret.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
