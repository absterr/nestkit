import { type } from "arktype";

// Add environment variables types here
export const envSchema = type({
  "+": "delete",
  NODE_ENV: "'development' | 'production' | 'test' = 'development'",
  PORT: type("string.integer.parse")
    .to("1 <= number.integer <= 65535")
    .default("3000"),
});

export type EnvironmentVariables = typeof envSchema.infer;
