import { err, okData } from "./types";
import type { ApiResponse, Secret } from "./types";
import { validateId, validateSecretInput } from "./validate";
import type { SecretStore } from "./store";

export interface Deps {
  store: SecretStore;
  uuid(): string;
  now(): string;
}

export async function handleAction(action: unknown, payload: unknown, deps: Deps): Promise<ApiResponse> {
  switch (action) {
    case "list": {
      const data = await deps.store.list();
      return okData(data);
    }

    case "create": {
      const input = validateSecretInput(payload);
      if (!input.ok) return err("BAD_REQUEST", input.message);
      const now = deps.now();
      const secret: Secret = { ...input.value, id: deps.uuid(), createdAt: now, updatedAt: now };
      await deps.store.insert(secret);
      return okData(secret);
    }

    case "update": {
      const id = validateId(payload);
      if (!id.ok) return err("BAD_REQUEST", id.message);
      const fields = validateSecretInput((payload as Record<string, unknown>).fields);
      if (!fields.ok) return err("BAD_REQUEST", fields.message);
      const current = await deps.store.findById(id.value);
      if (!current) return err("NOT_FOUND", `no secret with id ${id.value}`);
      const updated: Secret = {
        ...fields.value,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: deps.now(),
      };
      await deps.store.update(updated);
      return okData(updated);
    }

    case "delete": {
      const id = validateId(payload);
      if (!id.ok) return err("BAD_REQUEST", id.message);
      const removed = await deps.store.remove(id.value);
      if (!removed) return err("NOT_FOUND", `no secret with id ${id.value}`);
      return okData({ id: id.value });
    }

    default:
      return err("BAD_REQUEST", `unknown action: ${String(action)}`);
  }
}
