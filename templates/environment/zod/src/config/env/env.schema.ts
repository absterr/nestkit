import { z } from "zod";

// Add environment variables types here
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type EnvironmentVariables = z.infer<typeof envSchema>;
