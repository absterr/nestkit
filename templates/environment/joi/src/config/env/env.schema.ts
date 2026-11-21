import Joi from "joi";

// Include the env type in this interface
export interface EnvironmentVariables {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
}

// Add environment variables types here
export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),

  PORT: Joi.number().integer().min(1).max(65535).default(3000),
});
