import { z } from "zod";
import { envSchema } from "./env.schema";

export default function validate(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const formatted = formatZodIssues(parsed.error.issues);
    throw new Error(`Config validation error:\n${formatted}`);
  }

  return parsed.data;
}

const formatZodIssue = (issue: z.core.$ZodIssue) =>
  `${issue.path.join(".")}: ${issue.message}`;

const formatZodIssues = (issues: z.core.$ZodIssue[]) =>
  issues.map(formatZodIssue).join("\n");
