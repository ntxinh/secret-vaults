export const SECRET_TYPES = ["api_key", "connection_string", "client_secret", "other"] as const;
export const ENVIRONMENTS = ["dev", "staging", "prod", "-"] as const;

export type SecretType = (typeof SECRET_TYPES)[number];
export type Environment = (typeof ENVIRONMENTS)[number];

export interface Secret {
  id: string;
  name: string;
  value: string;
  type: SecretType;
  project: string;
  environment: Environment[];
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type SecretInput = Omit<Secret, "id" | "createdAt" | "updatedAt">;

export type ErrorCode = "UNAUTHORIZED" | "BAD_REQUEST" | "NOT_FOUND" | "INTERNAL";

export type ApiResponse =
  | { ok: true; data: unknown }
  | { ok: false; error: { code: ErrorCode; message: string } };

export function err(code: ErrorCode, message: string): ApiResponse {
  return { ok: false, error: { code, message } };
}

export function okData(data: unknown): ApiResponse {
  return { ok: true, data };
}
