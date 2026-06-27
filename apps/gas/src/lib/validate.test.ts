import { describe, expect, it } from "vitest";
import { validateId, validateSecretInput } from "./validate";

const valid = {
  name: "Stripe key",
  value: "sk_live_xyz",
  type: "api_key",
  project: "Stripe",
  environment: ["prod"],
  tags: ["payments"],
  notes: "",
};

describe("validateSecretInput", () => {
  it("accepts a valid payload", () => {
    expect(validateSecretInput(valid)).toEqual({ ok: true, value: valid });
  });

  it("defaults optional fields", () => {
    const result = validateSecretInput({ name: "n", value: "v", type: "other" });
    expect(result).toEqual({
      ok: true,
      value: { name: "n", value: "v", type: "other", project: "", environment: ["-"], tags: [], notes: "" },
    });
  });

  it.each([
    [null, "payload must be an object"],
    [{ ...valid, name: "" }, "name is required"],
    [{ ...valid, value: "" }, "value is required"],
    [{ ...valid, type: "password" }, "type must be one of"],
    [{ ...valid, environment: [] }, "environment must include at least one value"],
    [{ ...valid, environment: ["qa"] }, "environment must be one of"],
    [{ ...valid, environment: "prod" }, "environment must be an array"],
    [{ ...valid, tags: "not-array" }, "tags must be an array of strings"],
    [{ ...valid, tags: [1] }, "tags must be an array of strings"],
    [{ ...valid, notes: 5 }, "notes must be a string"],
    [{ ...valid, project: 5 }, "project must be a string"],
  ])("rejects %j", (payload, messagePrefix) => {
    const result = validateSecretInput(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(messagePrefix);
  });
});

describe("validateId", () => {
  it("accepts non-empty string id", () => {
    expect(validateId({ id: "abc" })).toEqual({ ok: true, value: "abc" });
  });

  it.each([[null], [{}], [{ id: "" }], [{ id: 5 }]])("rejects %j", (payload) => {
    expect(validateId(payload).ok).toBe(false);
  });
});
