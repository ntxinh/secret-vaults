"use client";

import { useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

export function LoginForm() {
  const setCredentials = useAuthStore((s) => s.setCredentials);
  const [gasUrl, setGasUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.list({ gasUrl: gasUrl.trim(), token: token.trim() });
      setCredentials(gasUrl.trim(), token.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-lg font-semibold">Secret Vaults</h1>
        <div className="space-y-1">
          <label htmlFor="gasUrl" className="text-sm text-zinc-400">Apps Script web app URL</label>
          <input
            id="gasUrl"
            type="url"
            required
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="token" className="text-sm text-zinc-400">API token</label>
          <input
            id="token"
            type="password"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          {loading ? "Connecting…" : "Unlock vault"}
        </button>
      </form>
    </main>
  );
}
