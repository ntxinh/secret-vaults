"use client";

import { useSecrets } from "../hooks/use-secrets";
import type { Secret } from "../lib/schema";
import { useAuthStore } from "../store/auth";
import { SecretsTable } from "./secrets-table";

export function Vault() {
  const { data, isPending, isError } = useSecrets();
  const secrets = (data as Secret[] | undefined) ?? [];
  const clear = useAuthStore((s) => s.clear);

  function onEdit(secret: Secret) {
    console.log("edit", secret.id); // replaced in Task 14
  }
  function onDelete(secret: Secret) {
    console.log("delete", secret.id); // replaced in Task 15
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Secret Vaults</h1>
        <button type="button" onClick={clear} className="text-sm text-zinc-400 hover:text-zinc-100">
          Lock
        </button>
      </div>
      {isPending ? (
        <p className="text-zinc-500">Loading…</p>
      ) : isError ? (
        <p className="text-red-400">Failed to load secrets.</p>
      ) : (
        <SecretsTable secrets={secrets} onEdit={onEdit} onDelete={onDelete} />
      )}
    </main>
  );
}
