import Joi from "joi";
import { envSchema } from "./env.schema";

export default function validate(config: Record<string, unknown>) {
  const result: Joi.ValidationResult<Record<string, unknown>> =
    envSchema.validate(config, {
      allowUnknown: true,
      abortEarly: false,
    });

  if (result.error) {
    throw new Error(`Config validation error:\n${result.error.message}`);
  }

  return result.value;
}
