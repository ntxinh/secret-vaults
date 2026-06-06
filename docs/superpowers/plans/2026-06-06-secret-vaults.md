# Secret Vaults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Personal secrets vault — Next.js 16 static frontend, Google Apps Script (GAS) action-RPC backend, Google Sheet as database, token auth.

**Architecture:** pnpm workspace with `apps/web` (Next.js 16, static export) and `apps/gas` (TypeScript compiled+bundled by esbuild, deployed with clasp). Frontend POSTs `{token, action, payload}` as `Content-Type: text/plain` (GAS cannot answer CORS preflight) to a single `doPost` handler; all responses are HTTP 200 with an `{ok, data|error}` envelope. GAS business logic is pure TS functions (testable with Vitest, no GAS runtime); a thin shell wires SpreadsheetApp/LockService/PropertiesService.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Radix UI (Dialog/AlertDialog/Toast), Zustand 5, TanStack Query 5 / Table 8 / Form 1, Zod 4, ky, esbuild, clasp 3, Vitest 3, mise, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-06-secret-vaults-design.md`

---

## File structure (final state)

```
secret-vaults/
├── mise.toml
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
├── README.md
├── apps/
│   ├── gas/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── build.mjs                 # esbuild bundle → dist/Code.js + appsscript.json copy
│   │   ├── .clasp.json               # scriptId placeholder, rootDir: dist
│   │   └── src/
│   │       ├── appsscript.json
│   │       ├── main.ts               # doPost shell + SheetStore (GAS APIs live ONLY here)
│   │       └── lib/
│   │           ├── types.ts          # Secret, SecretInput, HEADERS, ApiResponse, ErrorCode
│   │           ├── rows.ts           # rowToSecret / secretToRow (pure)
│   │           ├── rows.test.ts
│   │           ├── validate.ts       # validateSecretInput, validateId (pure)
│   │           ├── validate.test.ts
│   │           ├── dispatch.ts       # handleAction(action, payload, deps) (pure)
│   │           └── dispatch.test.ts
│   └── web/
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── postcss.config.mjs
│       └── src/
│           ├── app/
│           │   ├── globals.css
│           │   ├── layout.tsx
│           │   ├── providers.tsx     # QueryClientProvider + Toaster
│           │   └── page.tsx          # token gate: LoginForm | Vault
│           ├── lib/
│           │   ├── schema.ts         # Zod Secret/SecretInput (source of truth)
│           │   ├── schema.test.ts
│           │   ├── api.ts            # ky client, envelope parsing, ApiError
│           │   ├── api.test.ts
│           │   └── query-client.ts   # QueryClient w/ global error handling
│           ├── store/
│           │   ├── auth.ts           # gasUrl + token, persisted to localStorage
│           │   ├── ui.ts             # revealed row ids
│           │   └── toasts.ts         # toast queue
│           ├── hooks/
│           │   └── use-secrets.ts    # useSecrets, useCreate/Update/DeleteSecret
│           └── components/
│               ├── login-form.tsx
│               ├── vault.tsx         # table + toolbar + dialog state
│               ├── secrets-table.tsx
│               ├── secret-form-dialog.tsx
│               ├── delete-secret-dialog.tsx
│               └── toaster.tsx       # Radix Toast renderer
```

---

### Task 1: Workspace scaffolding

**Files:**
- Create: `mise.toml`
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Create `mise.toml`**

```toml
[tools]
node = "22"
pnpm = "10"

[tasks.dev]
run = "pnpm --filter web dev"

[tasks.build]
run = "pnpm --filter web build"

[tasks.test]
run = "pnpm -r test"

[tasks."gas:push"]
run = "pnpm --filter gas build && pnpm --filter gas push"

[tasks."gas:deploy"]
run = "pnpm --filter gas deploy"
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "secret-vaults",
  "private": true,
  "packageManager": "pnpm@10.0.0"
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
.next/
out/
dist/
.clasprc.json
.env*
*.tsbuildinfo
```

- [ ] **Step 5: Verify tooling**

Run: `mise install && mise exec -- node --version && mise exec -- pnpm --version`
Expected: node v22.x, pnpm 10.x printed, no errors.

- [ ] **Step 6: Commit**

```bash
git add mise.toml pnpm-workspace.yaml package.json .gitignore
git commit -m "chore: scaffold pnpm workspace and mise tooling"
```

---

### Task 2: GAS package setup

**Files:**
- Create: `apps/gas/package.json`
- Create: `apps/gas/tsconfig.json`
- Create: `apps/gas/build.mjs`
- Create: `apps/gas/.clasp.json`
- Create: `apps/gas/src/appsscript.json`

- [ ] **Step 1: Create `apps/gas/package.json`**

```json
{
  "name": "gas",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.mjs",
    "push": "clasp push --force",
    "deploy": "clasp deploy",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@google/clasp": "^3.0.0",
    "@types/google-apps-script": "^1.0.0",
    "esbuild": "^0.25.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `apps/gas/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["google-apps-script"]
  },
  "include": ["src/**/*.ts", "build.mjs"]
}
```

- [ ] **Step 3: Create `apps/gas/build.mjs`**

esbuild bundles to an IIFE under global `app`; the footer declares a real top-level `doPost` (GAS only recognizes top-level function declarations as web-app entry points).

```js
import { build } from "esbuild";
import { copyFileSync } from "node:fs";

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "iife",
  globalName: "app",
  outfile: "dist/Code.js",
  footer: { js: "function doPost(e) { return app.doPost(e); }" },
});
copyFileSync("src/appsscript.json", "dist/appsscript.json");
console.log("built dist/Code.js");
```

- [ ] **Step 4: Create `apps/gas/.clasp.json`**

`scriptId` is filled in during Task 7 (it is an identifier, not a secret — safe to commit).

```json
{
  "scriptId": "REPLACE_WITH_SCRIPT_ID",
  "rootDir": "dist"
}
```

- [ ] **Step 5: Create `apps/gas/src/appsscript.json`**

```json
{
  "timeZone": "Asia/Ho_Chi_Minh",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

- [ ] **Step 6: Install and verify**

Run: `pnpm install` (from repo root)
Expected: lockfile created, no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/gas pnpm-lock.yaml
git commit -m "chore(gas): set up clasp + esbuild + vitest package"
```

---

### Task 3: GAS types + row mapping (TDD)

**Files:**
- Create: `apps/gas/src/lib/types.ts`
- Create: `apps/gas/src/lib/rows.ts`
- Test: `apps/gas/src/lib/rows.test.ts`

- [ ] **Step 1: Create `apps/gas/src/lib/types.ts`**

```ts
export const SECRET_TYPES = ["api_key", "connection_string", "client_secret", "other"] as const;
export const ENVIRONMENTS = ["dev", "staging", "prod", "-"] as const;

export type SecretType = (typeof SECRET_TYPES)[number];
export type Environment = (typeof ENVIRONMENTS)[number];

export interface Secret {
  id: string;
  name: string;
  value: string;
  type: SecretType;
  project: string;
  environment: Environment;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type SecretInput = Omit<Secret, "id" | "createdAt" | "updatedAt">;

export const HEADERS = [
  "id", "name", "value", "type", "project",
  "environment", "tags", "notes", "createdAt", "updatedAt",
] as const;

export type Row = unknown[];

export type ErrorCode = "UNAUTHORIZED" | "BAD_REQUEST" | "NOT_FOUND" | "INTERNAL";

export type ApiResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: { code: ErrorCode; message: string } };

export function err(code: ErrorCode, message: string): ApiResponse {
  return { ok: false, error: { code, message } };
}

export function okData(data: unknown): ApiResponse {
  return { ok: true, data };
}
```

- [ ] **Step 2: Write failing test `apps/gas/src/lib/rows.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { rowToSecret, secretToRow } from "./rows";
import type { Secret } from "./types";

const secret: Secret = {
  id: "abc-123",
  name: "Stripe key",
  value: "sk_live_xyz",
  type: "api_key",
  project: "Stripe",
  environment: "prod",
  tags: ["payments", "critical"],
  notes: "rotate quarterly",
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("secretToRow", () => {
  it("serializes in HEADERS order with comma-joined tags", () => {
    expect(secretToRow(secret)).toEqual([
      "abc-123", "Stripe key", "sk_live_xyz", "api_key", "Stripe",
      "prod", "payments,critical", "rotate quarterly",
      "2026-06-06T00:00:00.000Z", "2026-06-06T00:00:00.000Z",
    ]);
  });
});

describe("rowToSecret", () => {
  it("round-trips a secret", () => {
    expect(rowToSecret(secretToRow(secret))).toEqual(secret);
  });

  it("parses empty tags cell as empty array", () => {
    const row = secretToRow({ ...secret, tags: [] });
    expect(rowToSecret(row).tags).toEqual([]);
  });

  it("coerces non-string cells (Sheets may return numbers/dates)", () => {
    const row = secretToRow(secret);
    row[1] = 42; // name cell came back as a number
    expect(rowToSecret(row).name).toBe("42");
  });

  it("trims whitespace around tags", () => {
    const row = secretToRow(secret);
    row[6] = "a , b ,c";
    expect(rowToSecret(row).tags).toEqual(["a", "b", "c"]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter gas test`
Expected: FAIL — cannot resolve `./rows`.

- [ ] **Step 4: Implement `apps/gas/src/lib/rows.ts`**

```ts
import type { Row, Secret } from "./types";

export function secretToRow(s: Secret): Row {
  return [
    s.id, s.name, s.value, s.type, s.project,
    s.environment, s.tags.join(","), s.notes, s.createdAt, s.updatedAt,
  ];
}

export function rowToSecret(row: Row): Secret {
  const cell = (i: number): string => (row[i] === undefined || row[i] === null ? "" : String(row[i]));
  const tagsCell = cell(6);
  return {
    id: cell(0),
    name: cell(1),
    value: cell(2),
    type: cell(3) as Secret["type"],
    project: cell(4),
    environment: cell(5) as Secret["environment"],
    tags: tagsCell === "" ? [] : tagsCell.split(",").map((t) => t.trim()).filter(Boolean),
    notes: cell(7),
    createdAt: cell(8),
    updatedAt: cell(9),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter gas test`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/gas/src/lib/types.ts apps/gas/src/lib/rows.ts apps/gas/src/lib/rows.test.ts
git commit -m "feat(gas): add secret types and sheet row mapping"
```

---

### Task 4: GAS payload validation (TDD)

**Files:**
- Create: `apps/gas/src/lib/validate.ts`
- Test: `apps/gas/src/lib/validate.test.ts`

- [ ] **Step 1: Write failing test `apps/gas/src/lib/validate.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { validateId, validateSecretInput } from "./validate";

const valid = {
  name: "Stripe key",
  value: "sk_live_xyz",
  type: "api_key",
  project: "Stripe",
  environment: "prod",
  tags: ["payments"],
  notes: "",
};

describe("validateSecretInput", () => {
  it("accepts a valid payload", () => {
    expect(validateSecretInput(valid)).toEqual({ ok: true, value: valid });
  });

  it("defaults optional fields", () => {
    const result = validateSecretInput({ name: "n", value: "v", type: "other" });
    expect(result).toEqual({
      ok: true,
      value: { name: "n", value: "v", type: "other", project: "", environment: "-", tags: [], notes: "" },
    });
  });

  it.each([
    [null, "payload must be an object"],
    [{ ...valid, name: "" }, "name is required"],
    [{ ...valid, value: "" }, "value is required"],
    [{ ...valid, type: "password" }, "type must be one of"],
    [{ ...valid, environment: "qa" }, "environment must be one of"],
    [{ ...valid, tags: "not-array" }, "tags must be an array of strings"],
    [{ ...valid, tags: [1] }, "tags must be an array of strings"],
    [{ ...valid, notes: 5 }, "notes must be a string"],
    [{ ...valid, project: 5 }, "project must be a string"],
  ])("rejects %j", (payload, messagePrefix) => {
    const result = validateSecretInput(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(messagePrefix);
  });
});

describe("validateId", () => {
  it("accepts non-empty string id", () => {
    expect(validateId({ id: "abc" })).toEqual({ ok: true, value: "abc" });
  });

  it.each([[null], [{}], [{ id: "" }], [{ id: 5 }]])("rejects %j", (payload) => {
    expect(validateId(payload).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter gas test`
Expected: FAIL — cannot resolve `./validate`.

- [ ] **Step 3: Implement `apps/gas/src/lib/validate.ts`**

```ts
import { ENVIRONMENTS, SECRET_TYPES } from "./types";
import type { Environment, SecretInput, SecretType } from "./types";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

export function validateSecretInput(payload: unknown): ValidationResult<SecretInput> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, message: "payload must be an object" };
  }
  const p = payload as Record<string, unknown>;

  if (typeof p.name !== "string" || p.name.trim() === "") {
    return { ok: false, message: "name is required" };
  }
  if (typeof p.value !== "string" || p.value === "") {
    return { ok: false, message: "value is required" };
  }
  if (typeof p.type !== "string" || !(SECRET_TYPES as readonly string[]).includes(p.type)) {
    return { ok: false, message: `type must be one of: ${SECRET_TYPES.join(", ")}` };
  }
  const project = p.project === undefined ? "" : p.project;
  if (typeof project !== "string") {
    return { ok: false, message: "project must be a string" };
  }
  const environment = p.environment === undefined ? "-" : p.environment;
  if (typeof environment !== "string" || !(ENVIRONMENTS as readonly string[]).includes(environment)) {
    return { ok: false, message: `environment must be one of: ${ENVIRONMENTS.join(", ")}` };
  }
  const tags = p.tags === undefined ? [] : p.tags;
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) {
    return { ok: false, message: "tags must be an array of strings" };
  }
  const notes = p.notes === undefined ? "" : p.notes;
  if (typeof notes !== "string") {
    return { ok: false, message: "notes must be a string" };
  }

  return {
    ok: true,
    value: {
      name: p.name,
      value: p.value,
      type: p.type as SecretType,
      project,
      environment: environment as Environment,
      tags: tags as string[],
      notes,
    },
  };
}

export function validateId(payload: unknown): ValidationResult<string> {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, message: "payload must be an object" };
  }
  const id = (payload as Record<string, unknown>).id;
  if (typeof id !== "string" || id === "") {
    return { ok: false, message: "id is required" };
  }
  return { ok: true, value: id };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter gas test`
Expected: PASS (all tests, including Task 3's).

- [ ] **Step 5: Commit**

```bash
git add apps/gas/src/lib/validate.ts apps/gas/src/lib/validate.test.ts
git commit -m "feat(gas): add payload validation"
```

---

### Task 5: GAS action dispatch (TDD)

**Files:**
- Create: `apps/gas/src/lib/dispatch.ts`
- Test: `apps/gas/src/lib/dispatch.test.ts`

`handleAction` is pure: all side effects go through an injected `SecretStore` + `uuid`/`now` deps, so tests use an in-memory fake.

- [ ] **Step 1: Write failing test `apps/gas/src/lib/dispatch.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { handleAction, type Deps, type SecretStore } from "./dispatch";
import type { Secret } from "./types";

function makeFakeStore(initial: Secret[] = []): SecretStore & { rows: Secret[] } {
  const rows = [...initial];
  return {
    rows,
    list: () => [...rows],
    findById: (id) => rows.find((s) => s.id === id) ?? null,
    insert: (s) => { rows.push(s); },
    update: (s) => {
      const i = rows.findIndex((r) => r.id === s.id);
      rows[i] = s;
    },
    remove: (id) => {
      const i = rows.findIndex((r) => r.id === id);
      if (i === -1) return false;
      rows.splice(i, 1);
      return true;
    },
  };
}

const existing: Secret = {
  id: "id-1", name: "old", value: "v1", type: "api_key", project: "p",
  environment: "dev", tags: [], notes: "", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

let store: ReturnType<typeof makeFakeStore>;
let deps: Deps;

beforeEach(() => {
  store = makeFakeStore([existing]);
  deps = { store, uuid: () => "new-uuid", now: () => "2026-06-06T12:00:00.000Z" };
});

describe("handleAction", () => {
  it("list returns all secrets", () => {
    expect(handleAction("list", undefined, deps)).toEqual({ ok: true, data: [existing] });
  });

  it("create inserts with generated id and timestamps", () => {
    const res = handleAction("create", { name: "n", value: "v", type: "other" }, deps);
    expect(res).toEqual({
      ok: true,
      data: {
        id: "new-uuid", name: "n", value: "v", type: "other", project: "",
        environment: "-", tags: [], notes: "",
        createdAt: "2026-06-06T12:00:00.000Z", updatedAt: "2026-06-06T12:00:00.000Z",
      },
    });
    expect(store.rows).toHaveLength(2);
  });

  it("create with bad payload returns BAD_REQUEST", () => {
    const res = handleAction("create", { name: "" }, deps);
    expect(res).toMatchObject({ ok: false, error: { code: "BAD_REQUEST" } });
  });

  it("update replaces fields, keeps id/createdAt, bumps updatedAt", () => {
    const res = handleAction(
      "update",
      { id: "id-1", fields: { name: "new name", value: "v2", type: "client_secret" } },
      deps,
    );
    expect(res).toEqual({
      ok: true,
      data: {
        id: "id-1", name: "new name", value: "v2", type: "client_secret",
        project: "", environment: "-", tags: [], notes: "",
        createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-06-06T12:00:00.000Z",
      },
    });
  });

  it("update unknown id returns NOT_FOUND", () => {
    const res = handleAction("update", { id: "nope", fields: { name: "n", value: "v", type: "other" } }, deps);
    expect(res).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("update with invalid fields returns BAD_REQUEST", () => {
    const res = handleAction("update", { id: "id-1", fields: { name: "" } }, deps);
    expect(res).toMatchObject({ ok: false, error: { code: "BAD_REQUEST" } });
  });

  it("delete removes and echoes id", () => {
    expect(handleAction("delete", { id: "id-1" }, deps)).toEqual({ ok: true, data: { id: "id-1" } });
    expect(store.rows).toHaveLength(0);
  });

  it("delete unknown id returns NOT_FOUND", () => {
    expect(handleAction("delete", { id: "nope" }, deps)).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });

  it("unknown action returns BAD_REQUEST", () => {
    expect(handleAction("explode", undefined, deps)).toMatchObject({
      ok: false,
      error: { code: "BAD_REQUEST" },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter gas test`
Expected: FAIL — cannot resolve `./dispatch`.

- [ ] **Step 3: Implement `apps/gas/src/lib/dispatch.ts`**

```ts
import { err, okData } from "./types";
import type { ApiResponse, Secret } from "./types";
import { validateId, validateSecretInput } from "./validate";

export interface SecretStore {
  list(): Secret[];
  findById(id: string): Secret | null;
  insert(secret: Secret): void;
  update(secret: Secret): void;
  remove(id: string): boolean;
}

export interface Deps {
  store: SecretStore;
  uuid(): string;
  now(): string;
}

export function handleAction(action: unknown, payload: unknown, deps: Deps): ApiResponse {
  switch (action) {
    case "list":
      return okData(deps.store.list());

    case "create": {
      const input = validateSecretInput(payload);
      if (!input.ok) return err("BAD_REQUEST", input.message);
      const now = deps.now();
      const secret: Secret = { ...input.value, id: deps.uuid(), createdAt: now, updatedAt: now };
      deps.store.insert(secret);
      return okData(secret);
    }

    case "update": {
      const id = validateId(payload);
      if (!id.ok) return err("BAD_REQUEST", id.message);
      const fields = validateSecretInput((payload as Record<string, unknown>).fields);
      if (!fields.ok) return err("BAD_REQUEST", fields.message);
      const current = deps.store.findById(id.value);
      if (!current) return err("NOT_FOUND", `no secret with id ${id.value}`);
      const updated: Secret = {
        ...fields.value,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: deps.now(),
      };
      deps.store.update(updated);
      return okData(updated);
    }

    case "delete": {
      const id = validateId(payload);
      if (!id.ok) return err("BAD_REQUEST", id.message);
      if (!deps.store.remove(id.value)) return err("NOT_FOUND", `no secret with id ${id.value}`);
      return okData({ id: id.value });
    }

    default:
      return err("BAD_REQUEST", `unknown action: ${String(action)}`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter gas test`
Expected: PASS (all gas tests).

- [ ] **Step 5: Commit**

```bash
git add apps/gas/src/lib/dispatch.ts apps/gas/src/lib/dispatch.test.ts
git commit -m "feat(gas): add action dispatch with injected store"
```

---

### Task 6: GAS doPost shell + SheetStore

**Files:**
- Create: `apps/gas/src/main.ts`

GAS-runtime code — not unit-testable; verified manually in Task 7. Keep it thin: parse → auth → lock (writes only) → dispatch → serialize.

- [ ] **Step 1: Create `apps/gas/src/main.ts`**

```ts
import { handleAction } from "./lib/dispatch";
import type { SecretStore } from "./lib/dispatch";
import { rowToSecret, secretToRow } from "./lib/rows";
import { err, HEADERS } from "./lib/types";
import type { ApiResponse, Secret } from "./lib/types";

const SHEET_NAME = "secrets";

function getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("SPREADSHEET_ID script property is not set");
  const ss = SpreadsheetApp.openById(id);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([...HEADERS]);
  }
  return sheet;
}

function makeSheetStore(sheet: GoogleAppsScript.Spreadsheet.Sheet): SecretStore {
  // Data rows start at row 2 (row 1 = header).
  const readAll = (): Secret[] => {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    return sheet
      .getRange(2, 1, lastRow - 1, HEADERS.length)
      .getValues()
      .map(rowToSecret);
  };
  const findRowIndex = (id: string): number => {
    // returns 1-based sheet row number, or -1
    const all = readAll();
    const i = all.findIndex((s) => s.id === id);
    return i === -1 ? -1 : i + 2;
  };
  return {
    list: readAll,
    findById: (id) => readAll().find((s) => s.id === id) ?? null,
    insert: (secret) => {
      sheet.appendRow(secretToRow(secret) as string[]);
    },
    update: (secret) => {
      const rowIndex = findRowIndex(secret.id);
      if (rowIndex === -1) throw new Error(`row not found for id ${secret.id}`);
      sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([secretToRow(secret)]);
    },
    remove: (id) => {
      const rowIndex = findRowIndex(id);
      if (rowIndex === -1) return false;
      sheet.deleteRow(rowIndex);
      return true;
    },
  };
}

const WRITE_ACTIONS = ["create", "update", "delete"];

export function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  let response: ApiResponse;
  try {
    const body = JSON.parse(e.postData.contents) as {
      token?: unknown;
      action?: unknown;
      payload?: unknown;
    };
    const expected = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
    if (!expected || body.token !== expected) {
      response = err("UNAUTHORIZED", "invalid token");
    } else {
      const deps = {
        store: makeSheetStore(getSheet()),
        uuid: () => Utilities.getUuid(),
        now: () => new Date().toISOString(),
      };
      if (WRITE_ACTIONS.includes(String(body.action))) {
        const lock = LockService.getScriptLock();
        lock.waitLock(10_000);
        try {
          response = handleAction(body.action, body.payload, deps);
        } finally {
          lock.releaseLock();
        }
      } else {
        response = handleAction(body.action, body.payload, deps);
      }
    }
  } catch (e2) {
    response = err("INTERNAL", e2 instanceof Error ? e2.message : String(e2));
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
```

- [ ] **Step 2: Verify build and typecheck**

Run: `pnpm --filter gas build && pnpm --filter gas typecheck`
Expected: `built dist/Code.js` printed; `dist/Code.js` and `dist/appsscript.json` exist; typecheck clean. Confirm the footer is present: `tail -1 apps/gas/dist/Code.js` shows `function doPost(e) { return app.doPost(e); }`.

- [ ] **Step 3: Run all gas tests still pass**

Run: `pnpm --filter gas test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/gas/src/main.ts
git commit -m "feat(gas): add doPost shell with sheet store, token auth, write lock"
```

---

### Task 7: Google-side setup + first deploy (manual, human-in-the-loop)

**Files:**
- Modify: `apps/gas/.clasp.json` (real scriptId)

These steps need the user's Google account. The executing agent should print these instructions and wait for the user to confirm each numbered item, then verify with curl.

- [ ] **Step 1: User performs Google setup**

1. Create a Google Sheet (any name). Copy its ID from the URL (`https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`).
2. Go to https://script.google.com → New project (standalone). Name it `secret-vaults`. Copy the Script ID (Project Settings → IDs).
3. In Project Settings → Script Properties, add:
   - `SPREADSHEET_ID` = the Sheet ID from step 1
   - `API_TOKEN` = output of `openssl rand -base64 32` (user keeps this — it is the login token)
4. Run `pnpm --filter gas exec clasp login` (opens browser OAuth).
5. Enable the Apps Script API at https://script.google.com/home/usersettings if not already enabled.

- [ ] **Step 2: Fill in scriptId and push**

Replace `REPLACE_WITH_SCRIPT_ID` in `apps/gas/.clasp.json` with the real Script ID, then:

Run: `mise run gas:push`
Expected: `Pushed 2 files.` (Code.js, appsscript.json).

- [ ] **Step 3: User deploys web app**

In the Apps Script editor: Deploy → New deployment → type **Web app** → Execute as **Me**, Who has access **Anyone** → Deploy. Copy the web app URL (`https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`).

(Subsequent code changes: `mise run gas:push` then Deploy → Manage deployments → edit → new version. `mise run gas:deploy` creates a new versioned deployment from CLI.)

- [ ] **Step 4: Smoke-test with curl**

```bash
GAS_URL="<web app /exec URL>"
TOKEN="<API_TOKEN value>"

# list (empty)
curl -sL -X POST "$GAS_URL" -H "Content-Type: text/plain" \
  -d "{\"token\":\"$TOKEN\",\"action\":\"list\"}"
# Expected: {"ok":true,"data":[]}

# bad token
curl -sL -X POST "$GAS_URL" -H "Content-Type: text/plain" \
  -d '{"token":"wrong","action":"list"}'
# Expected: {"ok":false,"error":{"code":"UNAUTHORIZED","message":"invalid token"}}

# create
curl -sL -X POST "$GAS_URL" -H "Content-Type: text/plain" \
  -d "{\"token\":\"$TOKEN\",\"action\":\"create\",\"payload\":{\"name\":\"test\",\"value\":\"v\",\"type\":\"other\"}}"
# Expected: {"ok":true,"data":{...with generated id...}} — and a new row visible in the Sheet
```

(`-L` matters: GAS replies 302 to script.googleusercontent.com.)

- [ ] **Step 5: Commit**

```bash
git add apps/gas/.clasp.json
git commit -m "chore(gas): point clasp at deployed script"
```

---

### Task 8: Web app scaffold (Next.js 16 + Tailwind 4 + Vitest)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx` (placeholder, replaced in Task 12)

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-alert-dialog": "^1.1.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.0",
    "@tanstack/react-form": "^1.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.20.0",
    "ky": "^1.7.0",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `apps/web/next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
```

- [ ] **Step 3: Create `apps/web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `apps/web/postcss.config.mjs`**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 5: Create `apps/web/src/app/globals.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 6: Create `apps/web/src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secret Vaults",
  description: "Personal secrets vault",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create placeholder `apps/web/src/app/page.tsx`**

```tsx
export default function Home() {
  return <main className="p-8">Secret Vaults — scaffolding OK</main>;
}
```

- [ ] **Step 8: Install and verify dev + build**

Run: `pnpm install` then `pnpm --filter web build`
Expected: build succeeds, `apps/web/out/index.html` exists (static export working).

- [ ] **Step 9: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "chore(web): scaffold Next.js 16 static export with Tailwind 4"
```

---

### Task 9: Zod schema (TDD)

**Files:**
- Create: `apps/web/src/lib/schema.ts`
- Test: `apps/web/src/lib/schema.test.ts`

- [ ] **Step 1: Write failing test `apps/web/src/lib/schema.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { secretInputSchema, secretSchema } from "./schema";

const valid = {
  id: "abc",
  name: "Stripe key",
  value: "sk_live_xyz",
  type: "api_key",
  project: "Stripe",
  environment: "prod",
  tags: ["payments"],
  notes: "",
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("secretSchema", () => {
  it("parses a valid secret", () => {
    expect(secretSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ["empty name", { ...valid, name: "" }],
    ["empty value", { ...valid, value: "" }],
    ["bad type", { ...valid, type: "password" }],
    ["bad environment", { ...valid, environment: "qa" }],
    ["non-string tag", { ...valid, tags: [1] }],
  ])("rejects %s", (_label, input) => {
    expect(secretSchema.safeParse(input).success).toBe(false);
  });
});

describe("secretInputSchema", () => {
  it("omits id and timestamps", () => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...input } = valid;
    expect(secretInputSchema.parse(input)).toEqual(input);
    expect(secretInputSchema.parse(valid)).toEqual(input); // extra keys stripped (Zod default)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — cannot resolve `./schema`.

- [ ] **Step 3: Implement `apps/web/src/lib/schema.ts`**

```ts
import { z } from "zod";

export const SECRET_TYPES = ["api_key", "connection_string", "client_secret", "other"] as const;
export const ENVIRONMENTS = ["dev", "staging", "prod", "-"] as const;

export const secretSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  value: z.string().min(1, "Value is required"),
  type: z.enum(SECRET_TYPES),
  project: z.string(),
  environment: z.enum(ENVIRONMENTS),
  tags: z.array(z.string()),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const secretInputSchema = secretSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Secret = z.infer<typeof secretSchema>;
export type SecretInput = z.infer<typeof secretInputSchema>;

export const SECRET_TYPE_LABELS: Record<Secret["type"], string> = {
  api_key: "API key",
  connection_string: "Connection string",
  client_secret: "Client secret",
  other: "Other",
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/schema.ts apps/web/src/lib/schema.test.ts
git commit -m "feat(web): add secret zod schemas"
```

---

### Task 10: API client (TDD)

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Test: `apps/web/src/lib/api.test.ts`

- [ ] **Step 1: Write failing test `apps/web/src/lib/api.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

const cfg = { gasUrl: "https://script.example/exec", token: "tok" };

const secret = {
  id: "abc", name: "n", value: "v", type: "api_key", project: "",
  environment: "-", tags: [], notes: "",
  createdAt: "2026-06-06T00:00:00.000Z", updatedAt: "2026-06-06T00:00:00.000Z",
};

function stubFetch(body: unknown) {
  const fn = vi.fn(async () =>
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("list sends text/plain RPC body and parses secrets", async () => {
    const fn = stubFetch({ ok: true, data: [secret] });
    const result = await api.list(cfg);
    expect(result).toEqual([secret]);

    const req = fn.mock.calls[0][0] as Request;
    expect(req.url).toBe(cfg.gasUrl);
    expect(req.method).toBe("POST");
    expect(req.headers.get("content-type")).toContain("text/plain");
    expect(JSON.parse(await req.text())).toEqual({ token: "tok", action: "list" });
  });

  it("create sends payload and parses created secret", async () => {
    const fn = stubFetch({ ok: true, data: secret });
    const input = { name: "n", value: "v", type: "api_key" as const, project: "", environment: "-" as const, tags: [], notes: "" };
    const result = await api.create(cfg, input);
    expect(result).toEqual(secret);
    const req = fn.mock.calls[0][0] as Request;
    expect(JSON.parse(await req.text())).toEqual({ token: "tok", action: "create", payload: input });
  });

  it("update wraps id + fields", async () => {
    const fn = stubFetch({ ok: true, data: secret });
    const input = { name: "n", value: "v", type: "api_key" as const, project: "", environment: "-" as const, tags: [], notes: "" };
    await api.update(cfg, "abc", input);
    const req = fn.mock.calls[0][0] as Request;
    expect(JSON.parse(await req.text())).toEqual({
      token: "tok", action: "update", payload: { id: "abc", fields: input },
    });
  });

  it("remove sends id and parses echo", async () => {
    stubFetch({ ok: true, data: { id: "abc" } });
    expect(await api.remove(cfg, "abc")).toEqual({ id: "abc" });
  });

  it("throws typed ApiError on ok:false envelope", async () => {
    stubFetch({ ok: false, error: { code: "UNAUTHORIZED", message: "invalid token" } });
    const promise = api.list(cfg);
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ code: "UNAUTHORIZED", message: "invalid token" });
  });

  it("throws on malformed envelope", async () => {
    stubFetch({ nonsense: true });
    await expect(api.list(cfg)).rejects.toThrow();
  });

  it("throws on data not matching schema", async () => {
    stubFetch({ ok: true, data: [{ bogus: 1 }] });
    await expect(api.list(cfg)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — cannot resolve `./api`.

- [ ] **Step 3: Implement `apps/web/src/lib/api.ts`**

```ts
import ky from "ky";
import { z } from "zod";
import { secretSchema } from "./schema";
import type { SecretInput } from "./schema";

export const ERROR_CODES = ["UNAUTHORIZED", "BAD_REQUEST", "NOT_FOUND", "INTERNAL"] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiConfig {
  gasUrl: string;
  token: string;
}

const envelopeSchema = z.union([
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({
    ok: z.literal(false),
    error: z.object({ code: z.enum(ERROR_CODES), message: z.string() }),
  }),
]);

async function call<T>(
  cfg: ApiConfig,
  action: "list" | "create" | "update" | "delete",
  payload: unknown,
  dataSchema: z.ZodType<T>,
): Promise<T> {
  // GAS cannot answer CORS preflight: text/plain is a "simple" content type → no preflight.
  // Body is a JSON string; GAS parses e.postData.contents. ky follows GAS's 302 redirect.
  const body: Record<string, unknown> = { token: cfg.token, action };
  if (payload !== undefined) body.payload = payload;

  const text = await ky
    .post(cfg.gasUrl, {
      body: JSON.stringify(body),
      headers: { "content-type": "text/plain;charset=utf-8" },
      timeout: 30_000,
    })
    .text();

  const envelope = envelopeSchema.parse(JSON.parse(text));
  if (!envelope.ok) throw new ApiError(envelope.error.code, envelope.error.message);
  return dataSchema.parse(envelope.data);
}

export const api = {
  list: (cfg: ApiConfig) => call(cfg, "list", undefined, z.array(secretSchema)),
  create: (cfg: ApiConfig, input: SecretInput) => call(cfg, "create", input, secretSchema),
  update: (cfg: ApiConfig, id: string, fields: SecretInput) =>
    call(cfg, "update", { id, fields }, secretSchema),
  remove: (cfg: ApiConfig, id: string) =>
    call(cfg, "delete", { id }, z.object({ id: z.string() })),
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test`
Expected: PASS (schema + api tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/lib/api.test.ts
git commit -m "feat(web): add ky API client with envelope parsing"
```

---

### Task 11: Stores + query client

**Files:**
- Create: `apps/web/src/store/auth.ts`
- Create: `apps/web/src/store/ui.ts`
- Create: `apps/web/src/store/toasts.ts`
- Create: `apps/web/src/lib/query-client.ts`
- Create: `apps/web/src/hooks/use-secrets.ts`

Plain wiring — no unit tests (covered transitively by manual verification in Tasks 12–15; spec scopes unit tests to schemas/envelope/row-mapping).

- [ ] **Step 1: Create `apps/web/src/store/auth.ts`**

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  gasUrl: string | null;
  token: string | null;
  setCredentials: (gasUrl: string, token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      gasUrl: null,
      token: null,
      setCredentials: (gasUrl, token) => set({ gasUrl, token }),
      clear: () => set({ gasUrl: null, token: null }),
    }),
    { name: "secret-vaults-auth" },
  ),
);
```

- [ ] **Step 2: Create `apps/web/src/store/ui.ts`**

```ts
import { create } from "zustand";

interface UiState {
  revealedIds: Record<string, true>;
  toggleRevealed: (id: string) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  revealedIds: {},
  toggleRevealed: (id) =>
    set((s) => {
      const next = { ...s.revealedIds };
      if (next[id]) delete next[id];
      else next[id] = true;
      return { revealedIds: next };
    }),
}));
```

- [ ] **Step 3: Create `apps/web/src/store/toasts.ts`**

```ts
import { create } from "zustand";

export interface ToastItem {
  id: number;
  title: string;
  variant: "success" | "error";
}

interface ToastState {
  toasts: ToastItem[];
  push: (title: string, variant?: ToastItem["variant"]) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (title, variant = "success") =>
    set((s) => ({ toasts: [...s.toasts, { id: nextId++, title, variant }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

- [ ] **Step 4: Create `apps/web/src/lib/query-client.ts`**

```ts
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { useToastStore } from "../store/toasts";
import { ApiError } from "./api";

function handleError(error: unknown) {
  if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
    useAuthStore.getState().clear();
    useToastStore.getState().push("Session invalid — log in again", "error");
    return;
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  useToastStore.getState().push(message, "error");
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false },
    },
  });
}
```

- [ ] **Step 5: Create `apps/web/src/hooks/use-secrets.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ApiConfig } from "../lib/api";
import type { SecretInput } from "../lib/schema";
import { useAuthStore } from "../store/auth";
import { useToastStore } from "../store/toasts";

export function useApiConfig(): ApiConfig | null {
  const gasUrl = useAuthStore((s) => s.gasUrl);
  const token = useAuthStore((s) => s.token);
  return gasUrl && token ? { gasUrl, token } : null;
}

export function useSecrets() {
  const cfg = useApiConfig();
  return useQuery({
    queryKey: ["secrets"],
    queryFn: () => api.list(cfg!),
    enabled: cfg !== null,
  });
}

function useInvalidateAndToast(message: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["secrets"] });
    useToastStore.getState().push(message);
  };
}

export function useCreateSecret() {
  const cfg = useApiConfig();
  const onSuccess = useInvalidateAndToast("Secret created");
  return useMutation({
    mutationFn: (input: SecretInput) => api.create(cfg!, input),
    onSuccess,
  });
}

export function useUpdateSecret() {
  const cfg = useApiConfig();
  const onSuccess = useInvalidateAndToast("Secret updated");
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: SecretInput }) =>
      api.update(cfg!, id, fields),
    onSuccess,
  });
}

export function useDeleteSecret() {
  const cfg = useApiConfig();
  const onSuccess = useInvalidateAndToast("Secret deleted");
  return useMutation({
    mutationFn: (id: string) => api.remove(cfg!, id),
    onSuccess,
  });
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/store apps/web/src/lib/query-client.ts apps/web/src/hooks
git commit -m "feat(web): add zustand stores, query client, secret hooks"
```

---

### Task 12: Providers, toaster, token gate, login form

**Files:**
- Create: `apps/web/src/components/toaster.tsx`
- Create: `apps/web/src/app/providers.tsx`
- Create: `apps/web/src/components/login-form.tsx`
- Create: `apps/web/src/components/vault.tsx` (placeholder, fleshed out in Task 13)
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Create `apps/web/src/components/toaster.tsx`**

```tsx
"use client";

import * as Toast from "@radix-ui/react-toast";
import { useToastStore } from "../store/toasts";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <Toast.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
          className={`rounded-md px-4 py-3 text-sm shadow-lg ${
            t.variant === "error" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-100"
          }`}
        >
          <Toast.Title>{t.title}</Toast.Title>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2" />
    </Toast.Provider>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/app/providers.tsx`**

```tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { makeQueryClient } from "../lib/query-client";
import { Toaster } from "../components/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/components/login-form.tsx`**

Login verifies credentials by issuing a real `list` call before persisting them.

```tsx
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
```

- [ ] **Step 4: Create placeholder `apps/web/src/components/vault.tsx`**

```tsx
"use client";

import { useSecrets } from "../hooks/use-secrets";

export function Vault() {
  const { data, isPending } = useSecrets();
  if (isPending) return <main className="p-8">Loading…</main>;
  return <main className="p-8">Vault — {data?.length ?? 0} secrets</main>;
}
```

- [ ] **Step 5: Replace `apps/web/src/app/page.tsx`**

The `mounted` guard avoids a hydration mismatch: localStorage-persisted Zustand state differs from the server-rendered (static) HTML on first paint.

```tsx
"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "../components/login-form";
import { Vault } from "../components/vault";
import { Providers } from "./providers";
import { useAuthStore } from "../store/auth";

function Gate() {
  const token = useAuthStore((s) => s.token);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return token ? <Vault /> : <LoginForm />;
}

export default function Home() {
  return (
    <Providers>
      <Gate />
    </Providers>
  );
}
```

- [ ] **Step 6: Manual verify**

Run: `mise run dev`, open http://localhost:3000.
Expected:
- Login form renders.
- Wrong token → error message "invalid token" shown, nothing persisted.
- Correct GAS URL + token → "Vault — N secrets" renders.
- Reload → goes straight to Vault (persisted).
- DevTools → Application → Local Storage shows `secret-vaults-auth`.

- [ ] **Step 7: Typecheck + tests, then commit**

Run: `pnpm --filter web typecheck && pnpm --filter web test`
Expected: clean / PASS.

```bash
git add apps/web/src
git commit -m "feat(web): add providers, toaster, login gate"
```

---

### Task 13: Secrets table (mask/reveal/copy, search, filters)

**Files:**
- Create: `apps/web/src/components/secrets-table.tsx`
- Modify: `apps/web/src/components/vault.tsx`

- [ ] **Step 1: Create `apps/web/src/components/secrets-table.tsx`**

```tsx
"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { Secret } from "../lib/schema";
import { ENVIRONMENTS, SECRET_TYPE_LABELS, SECRET_TYPES } from "../lib/schema";
import { useToastStore } from "../store/toasts";
import { useUiStore } from "../store/ui";

const columnHelper = createColumnHelper<Secret>();

function ValueCell({ secret }: { secret: Secret }) {
  const revealed = useUiStore((s) => Boolean(s.revealedIds[secret.id]));
  const toggleRevealed = useUiStore((s) => s.toggleRevealed);
  const push = useToastStore((s) => s.push);

  async function copy() {
    await navigator.clipboard.writeText(secret.value);
    push("Copied to clipboard");
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <span className="max-w-48 truncate">{revealed ? secret.value : "••••••••"}</span>
      <button
        type="button"
        onClick={() => toggleRevealed(secret.id)}
        title={revealed ? "Hide" : "Reveal"}
        className="text-zinc-400 hover:text-zinc-100"
      >
        {revealed ? "🙈" : "👁"}
      </button>
      <button type="button" onClick={copy} title="Copy" className="text-zinc-400 hover:text-zinc-100">
        📋
      </button>
    </div>
  );
}

interface Props {
  secrets: Secret[];
  onEdit: (secret: Secret) => void;
  onDelete: (secret: Secret) => void;
}

export function SecretsTable({ secrets, onEdit, onDelete }: Props) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [envFilter, setEnvFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const projects = useMemo(
    () => [...new Set(secrets.map((s) => s.project).filter(Boolean))].sort(),
    [secrets],
  );

  const filtered = useMemo(
    () =>
      secrets.filter(
        (s) =>
          (typeFilter === "" || s.type === typeFilter) &&
          (envFilter === "" || s.environment === envFilter) &&
          (projectFilter === "" || s.project === projectFilter),
      ),
    [secrets, typeFilter, envFilter, projectFilter],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => SECRET_TYPE_LABELS[info.getValue()],
      }),
      columnHelper.accessor("project", { header: "Project" }),
      columnHelper.accessor("environment", { header: "Env" }),
      columnHelper.accessor("tags", {
        header: "Tags",
        cell: (info) => (
          <div className="flex flex-wrap gap-1">
            {info.getValue().map((t) => (
              <span key={t} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">{t}</span>
            ))}
          </div>
        ),
        // include tags in global search
        filterFn: "includesString",
        getUniqueValues: (row) => row.tags,
      }),
      columnHelper.display({
        id: "value",
        header: "Value",
        cell: (info) => <ValueCell secret={info.row.original} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <div className="flex justify-end gap-2 text-sm">
            <button
              type="button"
              onClick={() => onEdit(info.row.original)}
              className="text-zinc-400 hover:text-zinc-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(info.row.original)}
              className="text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          </div>
        ),
      }),
    ],
    [onEdit, onDelete],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, value: string) => {
      const q = value.toLowerCase();
      const s = row.original;
      return [s.name, s.project, s.notes, ...s.tags].some((f) => f.toLowerCase().includes(q));
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectCls = "rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search name, project, tags, notes…"
          className="w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
          <option value="">All types</option>
          {SECRET_TYPES.map((t) => (
            <option key={t} value={t}>{SECRET_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className={selectCls}>
          <option value="">All envs</option>
          {ENVIRONMENTS.map((e2) => (
            <option key={e2} value={e2}>{e2}</option>
          ))}
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={selectCls}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-400">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-zinc-500">
                  No secrets found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-900/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `apps/web/src/components/vault.tsx`**

Dialog components arrive in Tasks 14–15; for now wire callbacks to console.

```tsx
"use client";

import { useSecrets } from "../hooks/use-secrets";
import type { Secret } from "../lib/schema";
import { useAuthStore } from "../store/auth";
import { SecretsTable } from "./secrets-table";

export function Vault() {
  const { data: secrets, isPending, isError } = useSecrets();
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
```

- [ ] **Step 3: Manual verify**

Run: `mise run dev`, log in.
Expected:
- Table shows secrets created via curl in Task 7.
- Value column masked; eye toggles reveal per row; copy button → toast "Copied to clipboard", clipboard holds the value.
- Search box narrows rows by name/project/tags/notes; type/env/project selects filter.
- "Lock" returns to login form.
- Narrow window: table scrolls horizontally, toolbar wraps.

- [ ] **Step 4: Typecheck, then commit**

Run: `pnpm --filter web typecheck`
Expected: clean.

```bash
git add apps/web/src/components
git commit -m "feat(web): add secrets table with mask, copy, search, filters"
```

---

### Task 14: Create/edit dialog (TanStack Form + Zod)

**Files:**
- Create: `apps/web/src/components/secret-form-dialog.tsx`
- Modify: `apps/web/src/components/vault.tsx`

The form keeps `tags` as a comma-separated string internally (easier text input) and converts to `string[]` on submit; the Zod form schema mirrors `secretInputSchema` except for that one field.

- [ ] **Step 1: Create `apps/web/src/components/secret-form-dialog.tsx`**

```tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useCreateSecret, useUpdateSecret } from "../hooks/use-secrets";
import type { Secret, SecretInput } from "../lib/schema";
import { ENVIRONMENTS, SECRET_TYPE_LABELS, SECRET_TYPES } from "../lib/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.string().min(1, "Value is required"),
  type: z.enum(SECRET_TYPES),
  project: z.string(),
  environment: z.enum(ENVIRONMENTS),
  tags: z.string(), // comma-separated in the form; converted on submit
  notes: z.string(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined → create mode; a Secret → edit mode */
  secret?: Secret;
}

const inputCls = "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm";
const labelCls = "text-sm text-zinc-400";

function FieldError({ errors }: { errors: unknown[] }) {
  if (errors.length === 0) return null;
  const first = errors[0];
  const message =
    typeof first === "object" && first !== null && "message" in first
      ? String((first as { message: unknown }).message)
      : String(first);
  return <p className="text-xs text-red-400">{message}</p>;
}

export function SecretFormDialog({ open, onOpenChange, secret }: Props) {
  const createSecret = useCreateSecret();
  const updateSecret = useUpdateSecret();

  const form = useForm({
    defaultValues: {
      name: secret?.name ?? "",
      value: secret?.value ?? "",
      type: secret?.type ?? ("api_key" as const),
      project: secret?.project ?? "",
      environment: secret?.environment ?? ("-" as const),
      tags: secret?.tags.join(", ") ?? "",
      notes: secret?.notes ?? "",
    },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      const input: SecretInput = {
        ...value,
        tags: value.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      if (secret) {
        await updateSecret.mutateAsync({ id: secret.id, fields: input });
      } else {
        await createSecret.mutateAsync(input);
      }
      onOpenChange(false);
    },
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset();
        onOpenChange(o);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <Dialog.Title className="text-lg font-semibold">
            {secret ? "Edit secret" : "Add secret"}
          </Dialog.Title>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
          >
            <form.Field name="name">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="f-name" className={labelCls}>Name *</label>
                  <input
                    id="f-name"
                    className={inputCls}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>

            <form.Field name="value">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="f-value" className={labelCls}>Value *</label>
                  <textarea
                    id="f-value"
                    rows={2}
                    className={`${inputCls} font-mono`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="type">
                {(field) => (
                  <div className="space-y-1">
                    <label htmlFor="f-type" className={labelCls}>Type</label>
                    <select
                      id="f-type"
                      className={inputCls}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value as (typeof SECRET_TYPES)[number])}
                    >
                      {SECRET_TYPES.map((t) => (
                        <option key={t} value={t}>{SECRET_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>

              <form.Field name="environment">
                {(field) => (
                  <div className="space-y-1">
                    <label htmlFor="f-env" className={labelCls}>Environment</label>
                    <select
                      id="f-env"
                      className={inputCls}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value as (typeof ENVIRONMENTS)[number])}
                    >
                      {ENVIRONMENTS.map((env) => (
                        <option key={env} value={env}>{env}</option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="project">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="f-project" className={labelCls}>Project</label>
                  <input
                    id="f-project"
                    className={inputCls}
                    placeholder="e.g. AWS prod, Stripe"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="tags">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="f-tags" className={labelCls}>Tags (comma-separated)</label>
                  <input
                    id="f-tags"
                    className={inputCls}
                    placeholder="payments, critical"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="notes">
              {(field) => (
                <div className="space-y-1">
                  <label htmlFor="f-notes" className={labelCls}>Notes</label>
                  <textarea
                    id="f-notes"
                    rows={2}
                    className={inputCls}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button type="button" className="rounded-md border border-zinc-700 px-3 py-2 text-sm">
                  Cancel
                </button>
              </Dialog.Close>
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving…" : "Save"}
                  </button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Wire into `apps/web/src/components/vault.tsx`** (replace file)

`dialogKey` forces a fresh form instance per open (defaultValues are captured at mount).

```tsx
"use client";

import { useState } from "react";
import { useSecrets } from "../hooks/use-secrets";
import type { Secret } from "../lib/schema";
import { useAuthStore } from "../store/auth";
import { SecretFormDialog } from "./secret-form-dialog";
import { SecretsTable } from "./secrets-table";

export function Vault() {
  const { data: secrets, isPending, isError } = useSecrets();
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
  function onDelete(secret: Secret) {
    console.log("delete", secret.id); // replaced in Task 15
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Secret Vaults</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900"
          >
            Add secret
          </button>
          <button type="button" onClick={clear} className="text-sm text-zinc-400 hover:text-zinc-100">
            Lock
          </button>
        </div>
      </div>
      {isPending ? (
        <p className="text-zinc-500">Loading…</p>
      ) : isError ? (
        <p className="text-red-400">Failed to load secrets.</p>
      ) : (
        <SecretsTable secrets={secrets} onEdit={openEdit} onDelete={onDelete} />
      )}
      <SecretFormDialog key={dialogKey} open={formOpen} onOpenChange={setFormOpen} secret={editing} />
    </main>
  );
}
```

- [ ] **Step 3: Manual verify**

Run: `mise run dev`.
Expected:
- "Add secret" opens empty dialog; submitting empty shows "Name is required"/"Value is required"; valid submit → toast "Secret created", row appears, Sheet has new row.
- "Edit" opens prefilled dialog; change name → save → toast "Secret updated", table refreshes.
- Cancel closes without saving.

- [ ] **Step 4: Typecheck, then commit**

Run: `pnpm --filter web typecheck`
Expected: clean.

```bash
git add apps/web/src/components
git commit -m "feat(web): add create/edit secret dialog"
```

---

### Task 15: Delete confirmation

**Files:**
- Create: `apps/web/src/components/delete-secret-dialog.tsx`
- Modify: `apps/web/src/components/vault.tsx`

- [ ] **Step 1: Create `apps/web/src/components/delete-secret-dialog.tsx`**

```tsx
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
            Delete “{secret?.name}”? This removes the row from the Sheet and cannot be undone.
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
```

- [ ] **Step 2: Wire into `apps/web/src/components/vault.tsx`**

Add state + replace `onDelete` + render dialog. Apply these three edits:

```tsx
// 1. import
import { DeleteSecretDialog } from "./delete-secret-dialog";

// 2. inside Vault(), replace the onDelete stub with state:
const [deleting, setDeleting] = useState<Secret | null>(null);
// ...and pass: <SecretsTable secrets={secrets} onEdit={openEdit} onDelete={setDeleting} />

// 3. render next to SecretFormDialog:
<DeleteSecretDialog secret={deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }} />
```

- [ ] **Step 3: Manual verify**

Run: `mise run dev`.
Expected: Delete → confirm dialog with secret name → Delete → toast "Secret deleted", row gone from table and Sheet. Cancel keeps it.

- [ ] **Step 4: Typecheck, then commit**

Run: `pnpm --filter web typecheck`
Expected: clean.

```bash
git add apps/web/src/components
git commit -m "feat(web): add delete confirmation dialog"
```

---

### Task 16: Final verification + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Full test + build sweep**

Run: `mise run test && mise run build && pnpm --filter gas build && pnpm -r typecheck`
Expected: all tests PASS, `apps/web/out/` produced, gas bundle builds, typechecks clean.

- [ ] **Step 2: End-to-end manual pass**

Serve the static export to prove it works without the Next dev server:

Run: `npx serve apps/web/out` (or `python3 -m http.server -d apps/web/out 3000`)
Expected: full flow works from the static build — login, list, create, edit, delete, reveal, copy, search, filters, lock.

- [ ] **Step 3: Write `README.md`**

```markdown
# Secret Vaults

Personal secrets vault. Next.js 16 static frontend; Google Apps Script backend; Google Sheet storage; token auth.

> ⚠️ Secrets are stored **in plaintext** in the Google Sheet (deliberate trade-off — see
> `docs/superpowers/specs/2026-06-06-secret-vaults-design.md`). Anyone with access to the Sheet,
> the Google account, or the API token can read everything. Protect all three.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Radix UI · Zustand · TanStack Query/Table/Form · Zod · ky · GAS + clasp · mise · pnpm

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
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and commands"
```

---

## Spec coverage map

| Spec requirement | Task |
|---|---|
| pnpm workspace + mise tasks | 1, 16 |
| GAS TS + clasp, no browser editing | 2, 6, 7 |
| Sheet data model, header row, comma tags | 3, 6 |
| Payload validation → BAD_REQUEST | 4, 5 |
| Action-RPC (list/create/update/delete), envelope, token → UNAUTHORIZED, NOT_FOUND, INTERNAL | 5, 6 |
| LockService on writes | 6 |
| text/plain CORS workaround | 6 (server), 10 (client) |
| Zod schema source of truth | 9 |
| ky client, ApiError, envelope parsing | 10 |
| Zustand: token persisted + revealed ids only | 11 |
| TanStack Query, invalidation, global error → toast, UNAUTHORIZED → logout | 11 |
| Login screen verifying via list | 12 |
| Table: mask/reveal, copy+toast, search + type/env/project filters | 13 |
| Radix Dialog + TanStack Form + Zod add/edit | 14 |
| Radix AlertDialog delete confirm | 15 |
| Static export, responsive | 8, 13, 16 |
| Unit tests: schemas, envelope, row mapping, mocked-fetch client | 3, 4, 5, 9, 10 |
```
