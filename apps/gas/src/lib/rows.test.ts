import { describe, expect, it } from "vitest";
import { rowToSecret, secretToRow } from "./rows";
import type { Secret } from "./types";

const secret: Secret = {
  id: "abc-123",
  name: "Stripe key",
  value: "sk_live_xyz",
  type: "api_key",
  project: "Stripe",
  environment: ["dev", "prod"],
  tags: ["payments", "critical"],
  notes: "rotate quarterly",
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("secretToRow", () => {
  it("serializes in HEADERS order with comma-joined tags", () => {
    expect(secretToRow(secret)).toEqual([
      "abc-123", "Stripe key", "sk_live_xyz", "api_key", "Stripe",
      "dev,prod", "payments,critical", "rotate quarterly",
      "2026-06-06T00:00:00.000Z", "2026-06-06T00:00:00.000Z",
    ]);
  });
});

describe("rowToSecret", () => {
  it("round-trips a secret", () => {
    expect(rowToSecret(secretToRow(secret))).toEqual(secret);
  });

  it("parses empty tags cell as empty array", () => {
    const row = secretToRow({ ...secret, tags: [] });
    expect(rowToSecret(row).tags).toEqual([]);
  });

  it("coerces non-string cells (Sheets may return numbers/dates)", () => {
    const row = secretToRow(secret);
    row[1] = 42; // name cell came back as a number
    expect(rowToSecret(row).name).toBe("42");
  });

  it("trims whitespace around tags", () => {
    const row = secretToRow(secret);
    row[6] = "a , b ,c";
    expect(rowToSecret(row).tags).toEqual(["a", "b", "c"]);
  });

  it("trims whitespace around environments", () => {
    const row = secretToRow(secret);
    row[5] = "dev , prod";
    expect(rowToSecret(row).environment).toEqual(["dev", "prod"]);
  });
});
