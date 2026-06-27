import { z } from "zod";
import { secretResponseSchema, secretSchema } from "./schema";
import type { SecretInput } from "./schema";

export const ERROR_CODES = ["UNAUTHORIZED", "BAD_REQUEST", "NOT_FOUND", "INTERNAL"] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiConfig {
  apiUrl: string;
  token: string;
}

const envelopeSchema = z.union([
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({
    ok: z.literal(false),
    error: z.object({ code: z.enum(ERROR_CODES), message: z.string() }),
  }),
]);

async function call<T>(
  cfg: ApiConfig,
  action: "list" | "create" | "update" | "delete",
  payload: unknown,
  dataSchema: z.ZodType<T, any, any>,
): Promise<T> {
  // GAS cannot answer CORS preflight: text/plain is a "simple" content type → no preflight.
  // Body is a JSON string; GAS parses e.postData.contents. ky follows GAS's 302 redirect.
  const body: Record<string, unknown> = { token: cfg.token, action };
  if (payload !== undefined) body.payload = payload;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let text: string;
  try {
    const res = await fetch(
      new Request(cfg.apiUrl, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "text/plain;charset=utf-8" },
        signal: controller.signal,
        redirect: "follow",
      }),
    );
    if (!res.ok) throw new ApiError("INTERNAL", `HTTP ${res.status}`);
    text = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const envelope = envelopeSchema.parse(JSON.parse(text));
  if (!envelope.ok) throw new ApiError(envelope.error.code, envelope.error.message);
  return dataSchema.parse(envelope.data);
}

export const api = {
  list: (cfg: ApiConfig) => call(cfg, "list", undefined, z.array(secretResponseSchema)),
  create: (cfg: ApiConfig, input: SecretInput) => call(cfg, "create", input, secretSchema),
  update: (cfg: ApiConfig, id: string, fields: SecretInput) =>
    call(cfg, "update", { id, fields }, secretSchema),
  remove: (cfg: ApiConfig, id: string) =>
    call(cfg, "delete", { id }, z.object({ id: z.string() })),
};
