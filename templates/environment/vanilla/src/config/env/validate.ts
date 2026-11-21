import { type EnvironmentVariables, envSchema } from "./env.schema";

export default function validate(config: Record<string, unknown>) {
  const result: Record<string, unknown> = {};

  for (const [key, rule] of Object.entries(envSchema)) {
    const value = config[key] ?? rule.default;
    const parsed = "transform" in rule ? rule.transform(value) : value;

    if (!rule.validate(parsed)) {
      throw new Error(`Config validation error: ${key} is invalid`);
    }

    result[key] = parsed;
  }

  return result as EnvironmentVariables;
}
