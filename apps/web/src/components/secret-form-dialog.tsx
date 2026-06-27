"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useCreateSecret, useUpdateSecret } from "../hooks/use-secrets";
import type { Secret, SecretInput } from "../lib/schema";
import { ENVIRONMENTS, SECRET_TYPE_LABELS, SECRET_TYPES, environmentSchema } from "../lib/schema";
import { buttonClasses, dialogClasses, fieldClasses, labelClasses } from "./style-tokens";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").refine((s) => s.trim().length > 0, "Name cannot be blank"),
  value: z.string().min(1, "Value is required"),
  type: z.enum(SECRET_TYPES),
  project: z.string(),
  environment: environmentSchema,
  tags: z.string(), // comma-separated in the form; converted on submit
  notes: z.string(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined → create mode; a Secret → edit mode */
  secret?: Secret;
}

type SubmitMeta = {
  action?: "addAnother";
};

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
    onSubmitMeta: {} as SubmitMeta,
    defaultValues: {
      name: secret?.name ?? "",
      value: secret?.value ?? "",
      type: secret?.type ?? ("api_key" as const),
      project: secret?.project ?? "",
      environment: secret?.environment ?? ["-"],
      tags: secret?.tags.join(", ") ?? "",
      notes: secret?.notes ?? "",
    },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value, meta }) => {
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
      if (meta?.action === "addAnother") {
        form.reset({
          name: "",
          value: "",
          type: value.type,
          project: value.project,
          environment: value.environment,
          tags: value.tags,
          notes: value.notes,
        });
        return;
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
        <Dialog.Content className={`${dialogClasses.panel} max-w-2xl p-8 sm:p-9`}>
          <Dialog.Title className={`${dialogClasses.title} text-2xl`}>
            {secret ? "Edit secret" : "Add secret"}
          </Dialog.Title>
          <form
            className="mt-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
          >
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor="f-name" className={`${labelClasses} text-base`}>Name *</label>
                  <input
                    id="f-name"
                    className={`${fieldClasses.input} text-base`}
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
                <div className="space-y-2">
                  <label htmlFor="f-value" className={`${labelClasses} text-base`}>Value *</label>
                  <textarea
                    id="f-value"
                    rows={4}
                    className={`${fieldClasses.textarea} min-h-32 text-base font-mono`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <form.Field name="type">
                {(field) => (
                  <div className="space-y-2">
                    <label htmlFor="f-type" className={`${labelClasses} text-base`}>Type</label>
                    <select
                      id="f-type"
                      className={`${fieldClasses.select} text-base`}
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
                {(field) => {
                  const selected = field.state.value;
                  return (
                    <div className="space-y-2">
                      <span className={`${labelClasses} text-base`}>Environment</span>
                      <div className="flex flex-wrap gap-3">
                        {ENVIRONMENTS.map((env) => (
                          <label
                            key={env}
                            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-zinc-700 px-3 py-2.5 text-base text-zinc-200"
                          >
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded border-zinc-600 bg-zinc-950 text-[#FCD535] focus:ring-[#FCD535]/40"
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
            </div>

            <form.Field name="project">
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor="f-project" className={`${labelClasses} text-base`}>Project</label>
                  <input
                    id="f-project"
                    className={`${fieldClasses.input} text-base`}
                    placeholder="e.g. AWS prod, Stripe"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="tags">
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor="f-tags" className={`${labelClasses} text-base`}>Tags (comma-separated)</label>
                  <input
                    id="f-tags"
                    className={`${fieldClasses.input} text-base`}
                    placeholder="payments, critical"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="notes">
              {(field) => (
                <div className="space-y-2">
                  <label htmlFor="f-notes" className={`${labelClasses} text-base`}>Notes</label>
                  <textarea
                    id="f-notes"
                    rows={4}
                    className={`${fieldClasses.textarea} min-h-28 text-base`}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" className={buttonClasses.secondary}>
                  Cancel
                </button>
              </Dialog.Close>
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <>
                    {!secret && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          void form.handleSubmit({ action: "addAnother" });
                        }}
                        className={buttonClasses.secondary}
                      >
                        {isSubmitting ? "Saving..." : "Save and add another"}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={buttonClasses.primary}
                    >
                      {isSubmitting ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
              </form.Subscribe>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
