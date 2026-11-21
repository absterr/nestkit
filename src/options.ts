export const PRESETS = ["base", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

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

// The parent overlay MUST NOT not copy these along with its own files
export const NESTED_OVERLAYS = RUNNERS.flatMap((r) => [
  eslintVariant(r),
  supertestVariant(r),
  seleniumVariant(r),
]);

// Overlays apply in order, so later ones overwrite earlier files
export function overlaysFor(s: {
  codeQuality: CodeQuality;
  unitTests: UnitTests;
  e2e: E2e;
  env: Env;
  e2eRunner?: Runner;
}): string[] {
  const runner = s.unitTests !== "none" ? s.unitTests : s.e2eRunner;
  const overlays = [...CODE_QUALITY_OVERLAYS[s.codeQuality]];

  if (runner) {
    overlays.push("test-runners/common", `test-runners/${runner}`);
    if (s.codeQuality === "eslint" && ESLINT_VARIANTS.has(runner)) {
      overlays.push(eslintVariant(runner));
    }
  }
  if (s.unitTests !== "none") {
    overlays.push("unit-tests/common", `unit-tests/${s.unitTests}`);
  }

  if (s.e2e === "supertest" && runner) {
    overlays.push(
      "e2e-tests/supertest",
      supertestVariant(runner),
      `e2e-tests/config-${runner}`
    );
  }
  if (s.e2e === "selenium" && runner) {
    overlays.push(
      "e2e-tests/e2e-scripts",
      "e2e-tests/selenium",
      seleniumVariant(runner),
      `e2e-tests/config-${runner}`
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
