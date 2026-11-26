import { type } from "arktype";
import { envSchema } from "./env.schema";

export default function validate(config: Record<string, unknown>) {
  const parsed = envSchema(config);

  if (parsed instanceof type.errors) {
    throw new Error(`Config validation error:\n${parsed.summary}`);
  }

  return parsed;
}
