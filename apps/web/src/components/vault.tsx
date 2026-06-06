"use client";

import { useSecrets } from "../hooks/use-secrets";

export function Vault() {
  const { data, isPending } = useSecrets();
  if (isPending) return <main className="p-8">Loading…</main>;
  return <main className="p-8">Vault — {Array.isArray(data) ? data.length : 0} secrets</main>;
}
