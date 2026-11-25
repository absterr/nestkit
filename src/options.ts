import type { NestMajor } from "./versions.js";

export const PRESETS = ["base", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

export const MODULE_SYSTEMS = ["cjs", "esm"] as const;
export type ModuleSystem = (typeof MODULE_SYSTEMS)[number];

export const CODE_QUALITY = ["biome", "eslint", "oxlint", "none"] as const;
export type CodeQuality = (typeof CODE_QUALITY)[number];

export const RUNNERS = ["jest", "vitest", "mocha"] as const;
export type Runner = (typeof RUNNERS)[number];

export const UNIT_TESTS = [...RUNNERS, "none"] as const;
export type UnitTests = (typeof UNIT_TESTS)[number];

export const E2E = [
  "supertest",
  "playwright",
  "cypress",
  "selenium",
  "none",
] as const;
export type E2e = (typeof E2E)[number];

export const ENV = [
  "joi",
  "class-validator",
  "zod",
  "vanilla",
  "none",
] as const;
export type Env = (typeof ENV)[number];

export const needsRunner = (e2e: E2e) =>
  e2e === "supertest" || e2e === "selenium";

// Runners that work for a Nest version and module system
export function runnersFor(
  nest: NestMajor,
  moduleSystem: ModuleSystem
): Runner[] {
  return nest === "11" && moduleSystem === "cjs"
    ? [...RUNNERS]
    : ["vitest", "mocha"];
}

// Runner that gets the "recommended" hint in prompts
export const recommendedRunner = (
  nest: NestMajor,
  moduleSystem: ModuleSystem
): Runner => (nest === "11" && moduleSystem === "cjs" ? "jest" : "vitest");

// Packages TypeScript 6 must load for each runner's globals.
export const RUNNER_TYPES: Record<Runner, string[]> = {
  jest: ["jest"],
  vitest: [],
  mocha: ["mocha"],
};

// Prettier is shared by the eslint and oxlint paths
const CODE_QUALITY_OVERLAYS: Record<CodeQuality, string[]> = {
  biome: ["code-quality/biome"],
  eslint: ["code-quality/prettier", "code-quality/eslint"],
  oxlint: ["code-quality/prettier", "code-quality/oxlint"],
  none: [],
};

// Runners that ship their own eslint.config.mjs
const ESLINT_VARIANTS = new Set<Runner>(["jest", "vitest"]);

// Variant overlays live inside their parent overlay's folder
const eslintVariant = (r: Runner) => `test-runners/${r}/eslint-${r}`;
const supertestVariant = (r: Runner) => `e2e-tests/supertest/${r}-supertest`;
const seleniumVariant = (r: Runner) => `e2e-tests/selenium/${r}-selenium`;

// Mocha is configured differently per module system, so it has a folder for each
const mochaUnit = (m: ModuleSystem) => `unit-tests/mocha/${m}-mocha`;
const mochaConfig = (m: ModuleSystem) =>
  `e2e-tests/runner-configs/mocha/${m}-mocha`;

// Runner config for e2e tests
const e2eConfig = (r: Runner, m: ModuleSystem) =>
  r === "mocha" ? mochaConfig(m) : `e2e-tests/runner-configs/${r}`;

// The parent overlay must not copy these along with its own files
export const NESTED_OVERLAYS = [
  ...RUNNERS.flatMap((r) => [
    eslintVariant(r),
    supertestVariant(r),
    seleniumVariant(r),
  ]),
  ...MODULE_SYSTEMS.flatMap((m) => [mochaUnit(m), mochaConfig(m)]),
];

// Overlays apply in order, so later ones overwrite earlier files
export function overlaysFor(s: {
  nest: NestMajor;
  moduleSystem: ModuleSystem;
  codeQuality: CodeQuality;
  unitTests: UnitTests;
  e2e: E2e;
  e2eRunner?: Runner;
  env: Env;
}): string[] {
  const runner = s.unitTests !== "none" ? s.unitTests : s.e2eRunner;
  const overlays: string[] = [];

  overlays.push(
    `versions/${s.nest}`,
    `${s.moduleSystem}-module`,
    ...CODE_QUALITY_OVERLAYS[s.codeQuality]
  );

  if (runner) {
    overlays.push("test-runners/common", `test-runners/${runner}`);
    if (s.codeQuality === "eslint" && ESLINT_VARIANTS.has(runner)) {
      overlays.push(eslintVariant(runner));
    }
  }
  if (s.unitTests !== "none") {
    overlays.push("unit-tests/common", `unit-tests/${s.unitTests}`);
    if (s.unitTests === "mocha") overlays.push(mochaUnit(s.moduleSystem));
  }

  if (s.e2e === "supertest" && runner) {
    overlays.push(
      "e2e-tests/supertest",
      supertestVariant(runner),
      e2eConfig(runner, s.moduleSystem)
    );
  }
  if (s.e2e === "selenium" && runner) {
    overlays.push(
      "e2e-tests/e2e-scripts",
      "e2e-tests/selenium",
      seleniumVariant(runner),
      e2eConfig(runner, s.moduleSystem)
    );
  }
  if (s.e2e === "playwright" || s.e2e === "cypress") {
    overlays.push("e2e-tests/e2e-scripts", `e2e-tests/${s.e2e}`);
  }

  if (s.env !== "none") {
    overlays.push("environment/common", `environment/${s.env}`);
  }
  return overlays;
}
