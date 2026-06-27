# Touch-Friendly Web Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entire Secret Vaults web app use larger, touch-friendly buttons, inputs, dialogs, table rows, and text while keeping the current dark Binance-inspired product feel.

**Architecture:** Add a small shared style-token module for common Tailwind class strings, then apply those tokens to the login form, vault shell, table, dialogs, and toasts. This keeps the change scoped to presentation and avoids changing API, schema, auth, filtering, or mutation behavior.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Radix Dialog/AlertDialog/Toast, TanStack Table/Form, Vitest, TypeScript.

---

## File Structure

- Create `apps/web/src/components/style-tokens.ts`: shared Tailwind class strings for buttons, inputs, labels, dialogs, chips, and icon action targets.
- Create `apps/web/src/components/style-tokens.test.ts`: tests proving the shared tokens include required touch-friendly sizing and primary yellow styling.
- Modify `apps/web/src/components/login-form.tsx`: larger card, title, labels, inputs, and unlock button.
- Modify `apps/web/src/components/vault.tsx`: larger page padding, title, Add Secret button, Lock button, and loading/error text.
- Modify `apps/web/src/components/secrets-table.tsx`: larger filters, table rows, chips, value controls, and row actions.
- Modify `apps/web/src/components/secret-form-dialog.tsx`: wider dialog, larger padding, controls, labels, checkboxes, and action buttons.
- Modify `apps/web/src/components/delete-secret-dialog.tsx`: larger dialog padding, text, and action buttons.
- Modify `apps/web/src/components/toaster.tsx`: ensure toast text and padding match the larger scale.

---

### Task 1: Shared Style Tokens

**Files:**
- Create: `apps/web/src/components/style-tokens.ts`
- Create: `apps/web/src/components/style-tokens.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/components/style-tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buttonClasses, chipClasses, dialogClasses, fieldClasses, iconButtonClasses } from "./style-tokens";

describe("touch-friendly style tokens", () => {
  it("keeps form controls at least 44px tall", () => {
    expect(fieldClasses.input).toContain("min-h-11");
    expect(fieldClasses.select).toContain("min-h-11");
    expect(fieldClasses.textarea).toContain("min-h-11");
  });

  it("uses 48px primary actions with Binance yellow", () => {
    expect(buttonClasses.primary).toContain("h-12");
    expect(buttonClasses.primary).toContain("bg-[#FCD535]");
    expect(buttonClasses.primary).toContain("text-zinc-950");
  });

  it("uses at least 44px secondary and destructive actions", () => {
    expect(buttonClasses.secondary).toContain("min-h-11");
    expect(buttonClasses.danger).toContain("min-h-11");
  });

  it("makes icon and chip targets readable", () => {
    expect(iconButtonClasses).toContain("min-h-11");
    expect(iconButtonClasses).toContain("min-w-11");
    expect(chipClasses).toContain("text-sm");
  });

  it("sets larger dialog surfaces", () => {
    expect(dialogClasses.panel).toContain("max-w-xl");
    expect(dialogClasses.panel).toContain("p-7");
    expect(dialogClasses.title).toContain("text-xl");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk pnpm --filter web test -- style-tokens.test.ts
```

Expected: FAIL because `apps/web/src/components/style-tokens.ts` does not exist.

- [ ] **Step 3: Add shared style tokens**

Create `apps/web/src/components/style-tokens.ts`:

```ts
export const buttonClasses = {
  primary:
    "inline-flex h-12 items-center justify-center rounded-md bg-[#FCD535] px-5 text-base font-semibold text-zinc-950 transition hover:bg-[#f0b90b] disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 px-4 py-2.5 text-base font-medium text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2.5 text-base font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100",
  danger:
    "inline-flex min-h-11 items-center justify-center rounded-md bg-red-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50",
};

export const fieldClasses = {
  input:
    "w-full min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-base text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#FCD535] focus:ring-2 focus:ring-[#FCD535]/30",
  select:
    "min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-base text-zinc-100 outline-none transition focus:border-[#FCD535] focus:ring-2 focus:ring-[#FCD535]/30",
  textarea:
    "w-full min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-base text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#FCD535] focus:ring-2 focus:ring-[#FCD535]/30",
};

export const labelClasses = "text-sm font-medium text-zinc-400";

export const chipClasses = "rounded-md bg-zinc-800 px-2.5 py-1 text-sm text-zinc-200";

export const iconButtonClasses =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100";

export const dialogClasses = {
  overlay: "fixed inset-0 z-40 bg-black/60",
  panel:
    "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-7 shadow-xl sm:p-8",
  title: "text-xl font-semibold text-zinc-100",
  description: "mt-3 text-base leading-7 text-zinc-400",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
rtk pnpm --filter web test -- style-tokens.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add apps/web/src/components/style-tokens.ts apps/web/src/components/style-tokens.test.ts
rtk git commit -m "feat(web): add touch-friendly style tokens"
```

---

### Task 2: Login, Vault Shell, And Toasts

**Files:**
- Modify: `apps/web/src/components/login-form.tsx`
- Modify: `apps/web/src/components/vault.tsx`
- Modify: `apps/web/src/components/toaster.tsx`

- [ ] **Step 1: Update login form imports and classes**

In `apps/web/src/components/login-form.tsx`, add:

```ts
import { buttonClasses, fieldClasses, labelClasses } from "./style-tokens";
```

Use these replacements:

```tsx
<main className="flex min-h-screen items-center justify-center p-6 sm:p-8">
  <form onSubmit={onSubmit} className="w-full max-w-lg space-y-5 rounded-xl border border-zinc-800 bg-zinc-900 p-7 sm:p-8">
    <h1 className="text-2xl font-semibold">Secret Vaults</h1>
```

For both labels:

```tsx
<label htmlFor="gasUrl" className={labelClasses}>Apps Script web app URL</label>
<label htmlFor="token" className={labelClasses}>API token</label>
```

For both inputs:

```tsx
className={fieldClasses.input}
```

For error:

```tsx
{error && <p className="text-sm leading-6 text-red-400">{error}</p>}
```

For submit button:

```tsx
className={`w-full ${buttonClasses.primary}`}
```

- [ ] **Step 2: Update vault shell imports and classes**

In `apps/web/src/components/vault.tsx`, add:

```ts
import { buttonClasses } from "./style-tokens";
```

Use these replacements:

```tsx
<main className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <h1 className="text-2xl font-semibold">Secret Vaults</h1>
    <div className="flex items-center gap-3">
```

For Add Secret:

```tsx
className={buttonClasses.primary}
```

For Lock:

```tsx
className={buttonClasses.ghost}
```

For status text:

```tsx
<p className="text-base text-zinc-500">Loading...</p>
<p className="text-base text-red-400">Failed to load secrets.</p>
```

- [ ] **Step 3: Update toaster classes**

In `apps/web/src/components/toaster.tsx`, replace toast root and viewport classes:

```tsx
className={`rounded-lg px-4 py-4 text-sm leading-6 shadow-lg ${
  t.variant === "error" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-100"
}`}
```

```tsx
<Toast.Viewport className="fixed bottom-4 right-4 z-50 flex w-[min(calc(100vw-2rem),24rem)] flex-col gap-3" />
```

- [ ] **Step 4: Run verification**

Run:

```bash
rtk pnpm --filter web typecheck
rtk pnpm --filter web test -- style-tokens.test.ts
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
rtk git add apps/web/src/components/login-form.tsx apps/web/src/components/vault.tsx apps/web/src/components/toaster.tsx
rtk git commit -m "feat(web): scale shell and login controls"
```

---

### Task 3: Filters And Secrets Table

**Files:**
- Modify: `apps/web/src/components/secrets-table.tsx`

- [ ] **Step 1: Import shared tokens**

Add:

```ts
import { buttonClasses, chipClasses, fieldClasses, iconButtonClasses } from "./style-tokens";
```

- [ ] **Step 2: Update value controls**

Replace the `ValueCell` wrapper and buttons with:

```tsx
<div className="flex items-center gap-2 font-mono text-sm">
  <span className="max-w-56 truncate">{revealed ? secret.value : "••••••••"}</span>
  <button
    type="button"
    onClick={() => toggleRevealed(secret.id)}
    title={revealed ? "Hide" : "Reveal"}
    className={iconButtonClasses}
  >
    {revealed ? "🙈" : "👁"}
  </button>
  <button type="button" onClick={copy} title="Copy" className={iconButtonClasses}>
    📋
  </button>
</div>
```

- [ ] **Step 3: Update chips**

For environment and tag chips, replace class names with:

```tsx
className={chipClasses}
```

- [ ] **Step 4: Update row action buttons**

Replace action wrapper and buttons with:

```tsx
<div className="flex justify-end gap-2 text-base">
  <button
    type="button"
    onClick={() => onEdit(info.row.original)}
    className={buttonClasses.ghost}
  >
    Edit
  </button>
  <button
    type="button"
    onClick={() => onDelete(info.row.original)}
    className="inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2.5 text-base font-medium text-red-400 transition hover:bg-red-950/40 hover:text-red-300"
  >
    Delete
  </button>
</div>
```

- [ ] **Step 5: Update filters and table sizing**

Replace:

```ts
const selectCls = "rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm";
```

with:

```ts
const selectCls = fieldClasses.select;
```

Replace search input class:

```tsx
className={`${fieldClasses.input} max-w-sm`}
```

Replace table wrapper/table/header/cell sizing:

```tsx
<div className="overflow-x-auto rounded-xl border border-zinc-800">
  <table className="w-full text-left text-base">
    <thead className="bg-zinc-900 text-sm uppercase text-zinc-400">
```

```tsx
<th key={h.id} className="px-4 py-3">
```

```tsx
<td colSpan={columns.length} className="px-4 py-10 text-center text-base text-zinc-500">
```

```tsx
<td key={cell.id} className="px-4 py-3 align-middle">
```

- [ ] **Step 6: Run verification**

Run:

```bash
rtk pnpm --filter web typecheck
rtk pnpm --filter web test -- style-tokens.test.ts
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```bash
rtk git add apps/web/src/components/secrets-table.tsx
rtk git commit -m "feat(web): scale secrets table controls"
```

---

### Task 4: Secret Form Dialog

**Files:**
- Modify: `apps/web/src/components/secret-form-dialog.tsx`

- [ ] **Step 1: Import shared tokens**

Add:

```ts
import { buttonClasses, dialogClasses, fieldClasses, labelClasses } from "./style-tokens";
```

- [ ] **Step 2: Replace local class constants**

Replace:

```ts
const inputCls = "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm";
const labelCls = "text-sm text-zinc-400";
```

with:

```ts
const inputCls = fieldClasses.input;
const textareaCls = fieldClasses.textarea;
const labelCls = labelClasses;
```

- [ ] **Step 3: Update field errors**

Replace `FieldError` return:

```tsx
return <p className="text-sm leading-6 text-red-400">{message}</p>;
```

- [ ] **Step 4: Update dialog shell**

Replace overlay/content/title classes:

```tsx
<Dialog.Overlay className={dialogClasses.overlay} />
<Dialog.Content className={dialogClasses.panel}>
  <Dialog.Title className={dialogClasses.title}>
```

Replace form spacing:

```tsx
className="mt-5 space-y-5"
```

- [ ] **Step 5: Update textareas and select**

For value textarea:

```tsx
className={`${textareaCls} font-mono`}
```

For type select:

```tsx
className={fieldClasses.select}
```

For notes textarea:

```tsx
className={textareaCls}
```

- [ ] **Step 6: Update environment checkbox targets**

Replace environment label class:

```tsx
className="flex min-h-11 items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-base text-zinc-200"
```

Replace checkbox class:

```tsx
className="h-4 w-4 accent-[#FCD535]"
```

- [ ] **Step 7: Update dialog buttons**

Use these button classes:

```tsx
<button type="button" className={buttonClasses.secondary}>
  Cancel
</button>
```

```tsx
className={buttonClasses.secondary}
```

```tsx
className={buttonClasses.primary}
```

Keep existing submit mode logic unchanged.

- [ ] **Step 8: Run verification**

Run:

```bash
rtk pnpm --filter web typecheck
rtk pnpm --filter web test -- style-tokens.test.ts
```

Expected: both commands pass.

- [ ] **Step 9: Commit**

```bash
rtk git add apps/web/src/components/secret-form-dialog.tsx
rtk git commit -m "feat(web): scale secret form dialog"
```

---

### Task 5: Delete Dialog

**Files:**
- Modify: `apps/web/src/components/delete-secret-dialog.tsx`

- [ ] **Step 1: Import shared tokens**

Add:

```ts
import { buttonClasses, dialogClasses } from "./style-tokens";
```

- [ ] **Step 2: Update dialog shell and text**

Replace overlay/content/title/description classes:

```tsx
<AlertDialog.Overlay className={dialogClasses.overlay} />
<AlertDialog.Content className={dialogClasses.panel.replace("max-w-xl", "max-w-lg")}>
  <AlertDialog.Title className={dialogClasses.title}>Delete secret</AlertDialog.Title>
  <AlertDialog.Description className={dialogClasses.description}>
```

Replace actions wrapper:

```tsx
<div className="mt-6 flex justify-end gap-3">
```

- [ ] **Step 3: Update action buttons**

Cancel:

```tsx
<button type="button" className={buttonClasses.secondary}>
  Cancel
</button>
```

Delete:

```tsx
className={buttonClasses.danger}
```

- [ ] **Step 4: Run verification**

Run:

```bash
rtk pnpm --filter web typecheck
rtk pnpm --filter web test -- style-tokens.test.ts
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
rtk git add apps/web/src/components/delete-secret-dialog.tsx
rtk git commit -m "feat(web): scale delete dialog"
```

---

### Task 6: Final Build And Visual Check

**Files:**
- Modify only if verification exposes a concrete issue in files changed by Tasks 1-5.

- [ ] **Step 1: Run full web verification**

Run:

```bash
rtk pnpm --filter web typecheck
rtk pnpm --filter web test
rtk pnpm --filter web build
```

Expected: all commands pass.

- [ ] **Step 2: Start local dev server**

Run:

```bash
rtk pnpm --filter web dev
```

Expected: Next dev server prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 3: Manual visual checks**

Check these screens in browser:

- Login form: title is larger, inputs are at least 44px tall, unlock is yellow and 48px tall.
- Vault shell: page title is larger, Add Secret is yellow, Lock target is easy to click.
- Filters: search and selects are 44px tall.
- Table: rows have larger padding, chips readable, reveal/copy/edit/delete targets are easy to click.
- Add Secret dialog: width, padding, labels, fields, environment checkboxes, and action buttons are larger.
- Edit Secret dialog: same scale as Add Secret.
- Delete dialog: text and buttons are larger; Delete remains red.
- Toast after copy: readable text and at least 16px padding.

- [ ] **Step 4: Stop dev server**

Use `Ctrl-C` in the terminal running `pnpm --filter web dev`.

- [ ] **Step 5: Commit any final visual fixes**

If Step 3 required small class-only fixes, commit those exact files:

```bash
rtk git add apps/web/src/components
rtk git commit -m "fix(web): polish touch-friendly spacing"
```

If Step 3 required no fixes, do not create an empty commit.

---

## Self-Review

- Spec coverage: login, vault shell, filters, table, value controls, add/edit dialog, delete dialog, toasts, error text, and verification are covered.
- Placeholder scan: no placeholder sections or deferred implementation notes remain.
- Type consistency: all imported token names match `style-tokens.ts`; commands use existing `web` package scripts.
