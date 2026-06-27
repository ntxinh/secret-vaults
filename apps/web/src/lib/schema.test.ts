import { describe, expect, it } from "vitest";
import { secretInputSchema, secretResponseSchema, secretSchema } from "./schema";

const valid = {
  id: "abc",
  name: "Stripe key",
  value: "sk_live_xyz",
  type: "api_key",
  project: "Stripe",
  environment: ["prod"],
  tags: ["payments"],
  notes: "",
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("secretSchema", () => {
  it("parses a valid secret", () => {
    expect(secretSchema.parse(valid)).toEqual(valid);
  });

  it("normalizes legacy string environment values", () => {
    expect(secretResponseSchema.parse({ ...valid, environment: "dev, prod" })).toEqual({
      ...valid,
      environment: ["dev", "prod"],
    });
  });

  it.each([
    ["empty name", { ...valid, name: "" }],
    ["empty value", { ...valid, value: "" }],
    ["bad type", { ...valid, type: "password" }],
    ["empty environment", { ...valid, environment: [] }],
    ["bad environment", { ...valid, environment: ["qa"] }],
    ["bad legacy string environment", { ...valid, environment: "qa, prod" }],
    ["non-string tag", { ...valid, tags: [1] }],
  ])("rejects %s", (_label, input) => {
    expect(secretSchema.safeParse(input).success).toBe(false);
  });
});

describe("secretInputSchema", () => {
  it("omits id and timestamps", () => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...input } = valid;
    expect(secretInputSchema.parse(input)).toEqual(input);
    expect(secretInputSchema.parse(valid)).toEqual(input); // extra keys stripped (Zod default)
  });
});
