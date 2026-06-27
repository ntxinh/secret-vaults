# Multi-Environment Secret Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one secret store multiple environments and add a create-mode `Save and add another` button that preserves Type, Environment, and Project.

**Architecture:** Change `environment` from one enum value to an enum array across web schemas, GAS types, validation, row mapping, and UI. Keep the existing Sheet column by serializing arrays as comma-separated strings. The dialog owns submit-mode behavior; the API contract keeps the same actions and envelopes.

**Tech Stack:** Next.js 16, React 19, TanStack Form, TanStack Query, TanStack Table, Zod 4, Vitest, GAS TypeScript.

---

## File Structure

- Modify `apps/web/src/lib/schema.ts`: change `environment` schema/type to array.
- Modify `apps/web/src/lib/schema.test.ts`: cover valid arrays, empty array rejection, invalid env rejection.
- Modify `apps/gas/src/lib/types.ts`: change `Secret.environment` to `Environment[]`.
- Modify `apps/gas/src/lib/validate.ts`: validate missing/default/empty/invalid environment arrays.
- Modify `apps/gas/src/lib/validate.test.ts`: cover GAS environment arrays.
- Modify `apps/gas/src/lib/rows.ts`: serialize/deserialize environment arrays in the existing column.
- Modify `apps/gas/src/lib/rows.test.ts`: cover env array round-trip.
- Modify `apps/gas/src/lib/dispatch.test.ts`: update fixtures and expected default envs.
- Modify `apps/web/src/components/secret-form-dialog.tsx`: add checkbox group and `Save and add another`.
- Modify `apps/web/src/components/secrets-table.tsx`: render env chips and update filter/search.

---

### Task 1: Web Schema

**Files:**
- Modify: `apps/web/src/lib/schema.ts`
- Test: `apps/web/src/lib/schema.test.ts`

- [ ] **Step 1: Write failing schema tests**

Replace the `valid.environment` fixture and add rejection cases in `apps/web/src/lib/schema.test.ts`:

```ts
const valid = {
  id: "abc",
  name: "Stripe key",
  value: "sk_live_xyz",
  type: "api_key",
  project: "Stripe",
  environment: ["prod"],
  tags: ["payments"],
  notes: "",
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};
```

Update rejection table entries:

```ts
["empty environment", { ...valid, environment: [] }],
["bad environment", { ...valid, environment: ["qa"] }],
["non-array environment", { ...valid, environment: "prod" }],
```

- [ ] **Step 2: Run web schema test and verify failure**

Run:

```bash
rtk pnpm --dir apps/web test src/lib/schema.test.ts
```

Expected: FAIL because `environment` still expects one enum string.

- [ ] **Step 3: Update web schema**

In `apps/web/src/lib/schema.ts`, add:

```ts
export const environmentSchema = z.array(z.enum(ENVIRONMENTS)).min(1, "Select at least one environment");
```

Change the `secretSchema` environment field:

```ts
environment: environmentSchema,
```

Keep `ENVIRONMENTS`, `SECRET_TYPES`, `Secret`, `SecretInput`, and `SECRET_TYPE_LABELS` exports.

- [ ] **Step 4: Run web schema test and verify pass**

Run:

```bash
rtk pnpm --dir apps/web test src/lib/schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add apps/web/src/lib/schema.ts apps/web/src/lib/schema.test.ts
rtk git commit -m "feat(web): model multiple secret environments"
```

---

### Task 2: GAS Types, Validation, And Row Mapping

**Files:**
- Modify: `apps/gas/src/lib/types.ts`
- Modify: `apps/gas/src/lib/validate.ts`
- Modify: `apps/gas/src/lib/rows.ts`
- Test: `apps/gas/src/lib/validate.test.ts`
- Test: `apps/gas/src/lib/rows.test.ts`

- [ ] **Step 1: Write failing GAS validation tests**

In `apps/gas/src/lib/validate.test.ts`, change `valid.environment`:

```ts
environment: ["prod"],
```

Update the defaults test expected value:

```ts
value: { name: "n", value: "v", type: "other", project: "", environment: ["-"], tags: [], notes: "" },
```

Add rejection cases:

```ts
[{ ...valid, environment: [] }, "environment must include at least one value"],
[{ ...valid, environment: ["qa"] }, "environment must be one of"],
[{ ...valid, environment: "prod" }, "environment must be an array"],
```

- [ ] **Step 2: Write failing row mapping tests**

In `apps/gas/src/lib/rows.test.ts`, change fixture env:

```ts
environment: ["dev", "prod"],
```

Update serialized row expected environment cell:

```ts
"dev,prod"
```

Add trimming test:

```ts
it("trims whitespace around environments", () => {
  const row = secretToRow(secret);
  row[5] = "dev , prod";
  expect(rowToSecret(row).environment).toEqual(["dev", "prod"]);
});
```

- [ ] **Step 3: Run GAS tests and verify failure**

Run:

```bash
rtk pnpm --dir apps/gas test src/lib/validate.test.ts src/lib/rows.test.ts
```

Expected: FAIL because types/validation/row mapping still use one string.

- [ ] **Step 4: Update GAS type**

In `apps/gas/src/lib/types.ts`, change:

```ts
environment: Environment[];
```

- [ ] **Step 5: Update GAS validation**

In `apps/gas/src/lib/validate.ts`, replace the current environment validation block with:

```ts
  const environment = p.environment === undefined ? ["-"] : p.environment;
  if (!Array.isArray(environment)) {
    return { ok: false, message: "environment must be an array" };
  }
  if (environment.length === 0) {
    return { ok: false, message: "environment must include at least one value" };
  }
  if (
    environment.some(
      (env) => typeof env !== "string" || !(ENVIRONMENTS as readonly string[]).includes(env),
    )
  ) {
    return { ok: false, message: `environment must be one of: ${ENVIRONMENTS.join(", ")}` };
  }
```

Return value field:

```ts
      environment: environment as Environment[],
```

- [ ] **Step 6: Update row serialization**

In `apps/gas/src/lib/rows.ts`, change `secretToRow` environment cell:

```ts
    s.environment.join(","),
```

In `rowToSecret`, add an environment parser near `tagsCell`:

```ts
  const environmentCell = cell(5);
  const environments = environmentCell === ""
    ? []
    : environmentCell.split(",").map((e) => e.trim()).filter(Boolean) as Secret["environment"];
```

Return field:

```ts
    environment: environments,
```

- [ ] **Step 7: Run GAS tests and verify pass**

Run:

```bash
rtk pnpm --dir apps/gas test src/lib/validate.test.ts src/lib/rows.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
rtk git add apps/gas/src/lib/types.ts apps/gas/src/lib/validate.ts apps/gas/src/lib/rows.ts apps/gas/src/lib/validate.test.ts apps/gas/src/lib/rows.test.ts
rtk git commit -m "feat(gas): store multiple secret environments"
```

---

### Task 3: GAS Dispatch Fixtures

**Files:**
- Modify: `apps/gas/src/lib/dispatch.test.ts`

- [ ] **Step 1: Update dispatch test fixtures**

In `apps/gas/src/lib/dispatch.test.ts`, change existing fixture:

```ts
const existing: Secret = {
  id: "id-1", name: "old", value: "v1", type: "api_key", project: "p",
  environment: ["dev"], tags: [], notes: "", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
```

Change expected default environments in create/update assertions:

```ts
environment: ["-"],
```

- [ ] **Step 2: Run dispatch test**

Run:

```bash
rtk pnpm --dir apps/gas test src/lib/dispatch.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
rtk git add apps/gas/src/lib/dispatch.test.ts
rtk git commit -m "test(gas): update dispatch environment fixtures"
```

---

### Task 4: Secret Form Dialog

**Files:**
- Modify: `apps/web/src/components/secret-form-dialog.tsx`

- [ ] **Step 1: Update imports and schema**

Change imports:

```ts
import { useRef } from "react";
import { z } from "zod";
import { useCreateSecret, useUpdateSecret } from "../hooks/use-secrets";
import type { Secret, SecretInput } from "../lib/schema";
import { ENVIRONMENTS, SECRET_TYPE_LABELS, SECRET_TYPES, environmentSchema } from "../lib/schema";
```

Change form schema:

```ts
  environment: environmentSchema,
```

- [ ] **Step 2: Add submit mode and array defaults**

Inside `SecretFormDialog`, before `useForm`:

```ts
  const submitMode = useRef<"close" | "addAnother">("close");
```

Change default environment:

```ts
      environment: secret?.environment ?? ["-"],
```

- [ ] **Step 3: Update submit behavior**

Replace the `onSubmit` body with:

```ts
    onSubmit: async ({ value }) => {
      const input: SecretInput = {
        ...value,
        tags: value.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      if (secret) {
        await updateSecret.mutateAsync({ id: secret.id, fields: input });
        onOpenChange(false);
        return;
      }

      await createSecret.mutateAsync(input);
      if (submitMode.current === "addAnother") {
        form.reset({
          name: "",
          value: "",
          type: value.type,
          project: value.project,
          environment: value.environment,
          tags: "",
          notes: "",
        });
        submitMode.current = "close";
        return;
      }
      onOpenChange(false);
    },
```

- [ ] **Step 4: Replace environment select with checkbox group**

Replace the existing `form.Field name="environment"` block with:

```tsx
              <form.Field name="environment">
                {(field) => {
                  const selected = field.state.value;
                  return (
                    <div className="space-y-1">
                      <span className={labelCls}>Environment</span>
                      <div className="flex flex-wrap gap-2">
                        {ENVIRONMENTS.map((env) => (
                          <label
                            key={env}
                            className="flex items-center gap-2 rounded-md border border-zinc-700 px-2 py-1.5 text-sm text-zinc-200"
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(env)}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selected, env]
                                  : selected.filter((v) => v !== env);
                                field.handleChange(next);
                              }}
                            />
                            {env}
                          </label>
                        ))}
                      </div>
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  );
                }}
              </form.Field>
```

- [ ] **Step 5: Add create-only Save and add another button**

Replace the submit button area inside `form.Subscribe` with:

```tsx
                {(isSubmitting) => (
                  <>
                    {!secret && (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        onClick={() => { submitMode.current = "addAnother"; }}
                        className="rounded-md border border-zinc-700 px-3 py-2 text-sm disabled:opacity-50"
                      >
                        {isSubmitting && submitMode.current === "addAnother" ? "Saving..." : "Save and add another"}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      onClick={() => { submitMode.current = "close"; }}
                      className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
                    >
                      {isSubmitting && submitMode.current === "close" ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
```

- [ ] **Step 6: Run targeted web test**

Run:

```bash
rtk pnpm --dir apps/web test src/lib/schema.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
rtk git add apps/web/src/components/secret-form-dialog.tsx
rtk git commit -m "feat(web): add multi-environment secret form"
```

---

### Task 5: Secrets Table

**Files:**
- Modify: `apps/web/src/components/secrets-table.tsx`

- [ ] **Step 1: Update environment filter**

Change filtered condition:

```ts
          (envFilter === "" || s.environment.includes(envFilter as Secret["environment"][number])) &&
```

- [ ] **Step 2: Update Env column rendering**

Replace environment accessor:

```tsx
      columnHelper.accessor("environment", {
        header: "Env",
        cell: (info) => (
          <div className="flex flex-wrap gap-1">
            {info.getValue().map((env) => (
              <span key={env} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">{env}</span>
            ))}
          </div>
        ),
      }),
```

- [ ] **Step 3: Include envs in global search**

Change global filter fields:

```ts
      return [s.name, s.project, s.notes, ...s.tags, ...s.environment].some((f) => f.toLowerCase().includes(q));
```

- [ ] **Step 4: Run web typecheck**

Run:

```bash
rtk pnpm --dir apps/web typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add apps/web/src/components/secrets-table.tsx
rtk git commit -m "feat(web): render and filter multiple environments"
```

---

### Task 6: Final Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run web tests**

Run:

```bash
rtk pnpm --dir apps/web test
```

Expected: PASS.

- [ ] **Step 2: Run web typecheck**

Run:

```bash
rtk pnpm --dir apps/web typecheck
```

Expected: PASS.

- [ ] **Step 3: Run web build**

Run:

```bash
rtk pnpm --dir apps/web build
```

Expected: PASS.

- [ ] **Step 4: Run GAS tests**

Run:

```bash
rtk pnpm --dir apps/gas test
```

Expected: PASS.

- [ ] **Step 5: Run GAS typecheck**

Run:

```bash
rtk pnpm --dir apps/gas typecheck
```

Expected: PASS.

- [ ] **Step 6: Run GAS build**

Run:

```bash
rtk pnpm --dir apps/gas build
```

Expected: PASS.

- [ ] **Step 7: Inspect worktree**

Run:

```bash
rtk git status --short
```

Expected: only pre-existing unrelated files remain, such as `apps/gas/.clasp.json` and `DESIGN.md`, unless the user changed more files during implementation.

- [ ] **Step 8: Commit verification fixes if any**

If verification required fixes, commit only the relevant modified implementation files:

```bash
rtk git add apps/web/src/lib/schema.ts apps/web/src/lib/schema.test.ts apps/gas/src/lib/types.ts apps/gas/src/lib/validate.ts apps/gas/src/lib/validate.test.ts apps/gas/src/lib/rows.ts apps/gas/src/lib/rows.test.ts apps/gas/src/lib/dispatch.test.ts apps/web/src/components/secret-form-dialog.tsx apps/web/src/components/secrets-table.tsx
rtk git commit -m "fix: complete multi-environment secret flow"
```

If no fixes were needed, do not create an empty commit.
