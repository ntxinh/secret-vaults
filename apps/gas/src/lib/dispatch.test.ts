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
