# Secret Vaults

Personal secrets vault. Next.js 16 static frontend; Google Apps Script backend; Google Sheet storage; token auth.

> ⚠️ Secrets are stored **in plaintext** in the Google Sheet (deliberate trade-off — see
> `docs/superpowers/specs/2026-06-06-secret-vaults-design.md`). Anyone with access to the Sheet,
> the Google account, or the API token can read everything. Protect all three.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Radix UI · Zustand · TanStack Query/Table/Form · Zod · GAS + clasp · mise · pnpm

## Setup

1. `mise install && pnpm install`
2. Google side (once): create a Sheet; create a standalone Apps Script project; set Script Properties
   `SPREADSHEET_ID` and `API_TOKEN` (e.g. `openssl rand -base64 32`); put the Script ID in
   `apps/gas/.clasp.json`; `pnpm --filter gas exec clasp login`.
3. `mise run gas:push`, then deploy in the Apps Script editor: Deploy → New deployment → Web app →
   Execute as **Me** / access **Anyone**. Copy the `/exec` URL.
4. `mise run dev` → open http://localhost:3000 → enter the `/exec` URL and the API token.

## Commands

| Command | What |
|---|---|
| `mise run dev` | Next.js dev server |
| `mise run build` | static export → `apps/web/out/` |
| `mise run test` | all unit tests |
| `mise run gas:push` | build + push GAS code |
| `mise run gas:deploy` | new versioned GAS deployment |

## Notes

- After GAS code changes: `mise run gas:push`, then update the deployment version
  (Manage deployments → edit → new version) or `mise run gas:deploy`.
- Frontend requests use `Content-Type: text/plain` — GAS web apps cannot answer CORS preflight.
