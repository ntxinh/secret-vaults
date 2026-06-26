import { z } from "zod";

export const SECRET_TYPES = ["api_key", "connection_string", "client_secret", "other"] as const;
export const ENVIRONMENTS = ["dev", "staging", "prod", "-"] as const;
export const environmentSchema = z.array(z.enum(ENVIRONMENTS)).min(1, "Select at least one environment");

export const secretSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  value: z.string().min(1, "Value is required"),
  type: z.enum(SECRET_TYPES),
  project: z.string(),
  environment: environmentSchema,
  tags: z.array(z.string()),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const secretInputSchema = secretSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Secret = z.infer<typeof secretSchema>;
export type SecretInput = z.infer<typeof secretInputSchema>;

export const SECRET_TYPE_LABELS: Record<Secret["type"], string> = {
  api_key: "API key",
  connection_string: "Connection string",
  client_secret: "Client secret",
  other: "Other",
};
