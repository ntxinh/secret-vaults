"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useCreateSecret, useUpdateSecret } from "../hooks/use-secrets";
import type { Secret, SecretInput } from "../lib/schema";
import { ENVIRONMENTS, SECRET_TYPE_LABELS, SECRET_TYPES } from "../lib/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").refine((s) => s.trim().length > 0, "Name cannot be blank"),
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
