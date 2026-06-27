# Secret Vaults

Personal secrets vault. Next.js 16 static frontend; **Cloudflare Workers** backend (primary) / Google Apps Script (backup); KV storage; token auth.

> ⚠️ Secrets are stored **in plaintext** in KV / the Google Sheet (deliberate trade-off — see
> `docs/superpowers/specs/2026-06-06-secret-vaults-design.md`). Anyone with access to the Cloudflare
> account, the Google account, or the API token can read everything. Protect all three.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Radix UI · Zustand · TanStack Query/Table/Form · Zod · Cloudflare Workers (Wrangler) · GAS + clasp (backup) · mise · pnpm

## Setup (Cloudflare Workers — primary)

1. `mise install && pnpm install`
2. Create a KV namespace: `pnpm --filter worker exec wrangler kv namespace create secrets`
3. Copy the returned `id` into `apps/worker/wrangler.jsonc`
4. Set the API token: `pnpm --filter worker exec wrangler secret put API_TOKEN` (e.g. `openssl rand -base64 32`)
5. `mise run worker:dev` — local dev server (default http://localhost:8787 http://localhost:8787/cdn-cgi/explorer)
6. `mise run worker:deploy` — deploy to Cloudflare
7. Open the web app: `mise run dev` → http://localhost:3000 → enter the workers.dev URL and the API token.

## Setup (Google Apps Script — backup)

1. Follow `apps/gas/README.md` or the original setup in `apps/gas/`:
   - Create a Sheet; create a standalone Apps Script project; set Script Properties
     `SPREADSHEET_ID` and `API_TOKEN`; put the Script ID in `apps/gas/.clasp.json`
   - `pnpm --filter gas exec clasp login`
   - `mise run gas:push`, then deploy in the Apps Script editor: Deploy → New deployment → Web app →
     Execute as **Me** / access **Anyone**. Copy the `/exec` URL.
2. Enter the `/exec` URL and the API token in the login form.

## Commands

| Command | What |
|---|---|
| `mise run dev` | Next.js dev server |
| `mise run build` | static export → `apps/web/out/` |
| `mise run test` | all unit tests |
| `mise run worker:dev` | local Worker dev server |
| `mise run worker:deploy` | deploy Worker to Cloudflare |
| `mise run gas:push` | build + push GAS code (backup) |
| `mise run gas:deploy` | new versioned GAS deployment (backup) |

## Notes

- The frontend sends `Content-Type: text/plain` for GAS compatibility — the Worker accepts it too.
- After Worker changes: `mise run worker:deploy`.
- After GAS code changes: `mise run gas:push`, then update the deployment version
  (Manage deployments → edit → new version) or `mise run gas:deploy`.
