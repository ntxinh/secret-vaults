"use client";

import { useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { buttonClasses, fieldClasses, labelClasses } from "./style-tokens";

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
    <main className="flex min-h-screen items-center justify-center p-6 sm:p-8">
      <form onSubmit={onSubmit} className="w-full max-w-xl space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-10 sm:p-12">
        <h1 className="text-3xl font-semibold sm:text-4xl">Secret Vaults</h1>
        <div className="space-y-1">
          <label htmlFor="gasUrl" className={labelClasses}>Apps Script web app URL</label>
          <input
            id="gasUrl"
            type="url"
            required
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            className={fieldClasses.input}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="token" className={labelClasses}>API token</label>
          <input
            id="token"
            type="password"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className={fieldClasses.input}
          />
        </div>
        {error && <p className="text-lg leading-7 text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className={`${buttonClasses.primary} w-full disabled:opacity-50`}>
          {loading ? "Connecting…" : "Unlock vault"}
        </button>
      </form>
    </main>
  );
}
