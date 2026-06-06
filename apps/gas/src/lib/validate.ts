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
