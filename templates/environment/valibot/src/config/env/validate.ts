import * as v from "valibot";
import { envSchema } from "./env.schema";

export default function validate(config: Record<string, unknown>) {
  const result = v.safeParse(envSchema, config, { abortPipeEarly: true });

  if (!result.success) {
    const formatted = result.issues.map(formatIssue).join("\n");
    throw new Error(`Config validation error:\n${formatted}`);
  }

  return result.output;
}

const formatIssue = (issue: v.BaseIssue<unknown>) =>
  `${v.getDotPath(issue)}: ${issue.message}`;
