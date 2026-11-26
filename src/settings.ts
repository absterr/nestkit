import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  CODE_QUALITY,
  E2E,
  ENV,
  MODULE_SYSTEMS,
  RUNNERS,
  UNIT_TESTS,
  type CodeQuality,
  type E2e,
  type Env,
  type ModuleSystem,
  type Runner,
  type UnitTests,
} from "./options.js";

export interface Settings {
  moduleSystem: ModuleSystem;
  codeQuality: CodeQuality;
  unitTests: UnitTests;
  e2e: E2e;
  e2eRunner?: Runner;
  env: Env;
}

const FILE = path.join(homedir(), ".nestkit", "settings.json");

const isOneOf = <T extends string>(
  list: readonly T[],
  value: unknown
): value is T => list.some((item) => item === value);

// Undefined when nothing is saved or the file is unreadable or out of date
export function loadSettings(): Settings | undefined {
  try {
    const { moduleSystem, codeQuality, unitTests, e2e, e2eRunner, env } =
      JSON.parse(readFileSync(FILE, "utf8"));
    if (
      isOneOf(MODULE_SYSTEMS, moduleSystem) &&
      isOneOf(CODE_QUALITY, codeQuality) &&
      isOneOf(UNIT_TESTS, unitTests) &&
      isOneOf(E2E, e2e) &&
      (e2eRunner === undefined || isOneOf(RUNNERS, e2eRunner)) &&
      isOneOf(ENV, env)
    ) {
      return { moduleSystem, codeQuality, unitTests, e2e, e2eRunner, env };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function saveSettings(settings: Settings): boolean {
  try {
    mkdirSync(path.dirname(FILE), { recursive: true });
    writeFileSync(FILE, `${JSON.stringify(settings, null, 2)}\n`);
    return true;
  } catch {
    return false;
  }
}

export const describeSettings = (s: Settings): string =>
  [s.moduleSystem, s.codeQuality, s.unitTests, s.e2e, s.env]
    .filter((value) => value !== "none")
    .join(", ");
