import type { Secret } from "./types";

export interface SecretStore {
  list(): Promise<Secret[]>;
  findById(id: string): Promise<Secret | null>;
  insert(secret: Secret): Promise<void>;
  update(secret: Secret): Promise<void>;
  remove(id: string): Promise<boolean>;
}

export function makeKvStore(kv: KVNamespace): SecretStore {
  const KEY = "secrets:data";

  async function readAll(): Promise<Secret[]> {
    const raw = await kv.get(KEY, "text");
    return raw ? JSON.parse(raw) : [];
  }

  async function writeAll(secrets: Secret[]): Promise<void> {
    await kv.put(KEY, JSON.stringify(secrets));
  }

  return {
    list: readAll,
    findById: async (id) => {
      const all = await readAll();
      return all.find((s) => s.id === id) ?? null;
    },
    insert: async (secret) => {
      const all = await readAll();
      all.push(secret);
      await writeAll(all);
    },
    update: async (secret) => {
      const all = await readAll();
      const i = all.findIndex((s) => s.id === secret.id);
      if (i === -1) throw new Error(`not found: ${secret.id}`);
      all[i] = secret;
      await writeAll(all);
    },
    remove: async (id) => {
      const all = await readAll();
      const i = all.findIndex((s) => s.id === id);
      if (i === -1) return false;
      all.splice(i, 1);
      await writeAll(all);
      return true;
    },
  };
}
