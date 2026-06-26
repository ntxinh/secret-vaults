# Multi-Environment Secret Dialog Design

**Date:** 2026-06-26
**Status:** Approved

## Summary

Update the secret form so a secret can belong to multiple environments. Add a create-only `Save and add another` action that keeps Type, Environment, and Project selected while clearing the fields that are normally unique per secret.

## Goals

- Allow selecting multiple environments in the Add/Edit Secret dialog.
- Store environments as an array in the application and API model.
- Keep the existing Google Sheet column layout.
- Add a create-mode button that saves the current secret and resets only Name, Value, Tags, and Notes.
- Preserve current edit behavior except for supporting multiple environments.

## Data Model

Change `Secret.environment` and `SecretInput.environment` from a single `Environment` to `Environment[]` in both web and GAS code.

Allowed environment values remain:

```ts
["dev", "staging", "prod", "-"]
```

Validation requires at least one environment and rejects any value outside the allowed set. There is no legacy migration requirement because the sheet has no old rows.

The Google Sheet still uses the existing `environment` column. GAS writes multiple environments as a comma-separated string, for example:

```text
dev,prod
```

GAS reads the column back by splitting on commas, trimming values, and returning an `Environment[]`.

## Dialog Behavior

The Environment field becomes a compact checkbox group because there are only four options and selected values stay visible without extra interaction.

Default create values:

- `type`: `api_key`
- `environment`: `["-"]`
- `project`: empty string

Create mode has three footer actions:

- `Cancel`: closes the dialog and resets the form.
- `Save`: creates the secret, closes the dialog, and resets the form.
- `Save and add another`: creates the secret, keeps the dialog open, keeps Type, Environment, and Project, then clears Name, Value, Tags, and Notes.

Edit mode keeps the existing footer shape:

- `Cancel`
- `Save`

Edit mode saves the full updated environment array and closes the dialog on success.

During any submit, both save buttons are disabled. If create/update fails, the dialog stays open and current form values remain visible.

## Table And Filters

The Secrets table Env column renders all environments for a row as small chips matching the existing tag chip style.

The Env filter remains a single-select dropdown with `All envs` plus the known environment values. A row matches when:

```ts
secret.environment.includes(envFilter)
```

Global search includes environment values in addition to name, project, notes, and tags.

## API Contract

The action names and request envelope stay unchanged:

```ts
{ token: string, action: "list" | "create" | "update" | "delete", payload?: unknown }
```

Only the `Secret` and `SecretInput` shape changes:

```ts
environment: Environment[]
```

`create` and `update` reject missing, empty, or invalid environment arrays with `BAD_REQUEST`.

## Testing

Update focused unit tests:

- Web schema tests accept `environment: ["prod"]`.
- Web schema tests reject empty arrays and invalid environment values.
- GAS validation tests accept valid environment arrays.
- GAS validation tests default missing environment to `["-"]`, matching current optional-field behavior.
- GAS validation tests reject empty arrays and invalid environment values.
- Row mapping tests verify `["dev", "prod"]` stores as `dev,prod` and reads back as `["dev", "prod"]`.

No component tests are required because the current repo has no component test setup. Typecheck/build and the existing Vitest suites are the required verification.

## Out Of Scope

- Backward compatibility for old single-environment rows.
- Creating one duplicate secret per selected environment.
- Adding custom environment names.
- Changing the sheet headers.
