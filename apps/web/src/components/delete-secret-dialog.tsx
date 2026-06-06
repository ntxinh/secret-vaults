"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useDeleteSecret } from "../hooks/use-secrets";
import type { Secret } from "../lib/schema";

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
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <AlertDialog.Title className="text-lg font-semibold">Delete secret</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-zinc-400">
            Delete "{secret?.name}"? This removes the row from the Sheet and cannot be undone.
          </AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button type="button" className="rounded-md border border-zinc-700 px-3 py-2 text-sm">
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              onClick={confirm}
              disabled={deleteSecret.isPending}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {deleteSecret.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
