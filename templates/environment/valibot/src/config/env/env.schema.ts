import * as v from "valibot";

const port = v.pipe(
  v.unknown(),
  v.transform(Number),
  v.integer(),
  v.minValue(1),
  v.maxValue(65535)
);

// Add environment variables types here
export const envSchema = v.object({
  NODE_ENV: v.optional(
    v.picklist(["development", "production", "test"]),
    "development"
  ),
  PORT: v.optional(port, 3000),
});

export type EnvironmentVariables = v.InferOutput<typeof envSchema>;
