import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

const cfg = { gasUrl: "https://script.example/exec", token: "tok" };

const secret = {
  id: "abc", name: "n", value: "v", type: "api_key", project: "",
  environment: "-", tags: [], notes: "",
  createdAt: "2026-06-06T00:00:00.000Z", updatedAt: "2026-06-06T00:00:00.000Z",
};

function stubFetch(body: unknown) {
  const fn = vi.fn(async (_req: Request) =>
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
