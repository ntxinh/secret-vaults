"use client";

import { useState } from "react";
import { useSecrets } from "../hooks/use-secrets";
import type { Secret } from "../lib/schema";
import { useAuthStore } from "../store/auth";
import { DeleteSecretDialog } from "./delete-secret-dialog";
import { SecretFormDialog } from "./secret-form-dialog";
import { SecretsTable } from "./secrets-table";
import { buttonClasses } from "./style-tokens";

export function Vault() {
  const { data, isPending, isError } = useSecrets();
  const secrets = (data as Secret[] | undefined) ?? [];
  const clear = useAuthStore((s) => s.clear);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Secret | undefined>(undefined);
  const [dialogKey, setDialogKey] = useState(0);

  function openCreate() {
    setEditing(undefined);
    setDialogKey((k) => k + 1);
    setFormOpen(true);
  }
  function openEdit(secret: Secret) {
    setEditing(secret);
    setDialogKey((k) => k + 1);
    setFormOpen(true);
  }
  const [deleting, setDeleting] = useState<Secret | null>(null);

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-6 py-8 sm:px-10 sm:py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold sm:text-4xl">Secret Vaults</h1>
        <div className="flex items-center gap-3">
          <button type="button" onClick={openCreate} className={buttonClasses.primary}>
            Add secret
          </button>
          <button type="button" onClick={clear} className={buttonClasses.ghost}>
            Lock
          </button>
        </div>
      </div>
      {isPending ? (
        <p className="text-lg leading-7 text-zinc-500">Loading…</p>
      ) : isError ? (
        <p className="text-lg leading-7 text-red-400">Failed to load secrets.</p>
      ) : (
        <SecretsTable secrets={secrets} onEdit={openEdit} onDelete={setDeleting} />
      )}
      <SecretFormDialog key={dialogKey} open={formOpen} onOpenChange={setFormOpen} secret={editing} />
      <DeleteSecretDialog secret={deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }} />
    </main>
  );
}
