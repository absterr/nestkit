#!/usr/bin/env node
import * as p from "@clack/prompts";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  CODE_QUALITY,
  E2E,
  PRESETS,
  RUNNERS,
  UNIT_TESTS,
  needsRunner,
  overlaysFor,
  type CodeQuality,
  type E2e,
  type Preset,
  type Runner,
  type UnitTests,
} from "./options.js";
import {
  detectInstalled,
  invokedBy,
  type PackageManager,
} from "./package-managers.js";
import {
  applyOverlay,
  copyBase,
  gitInstalled,
  initGit,
  insideGitRepo,
  install,
} from "./scaffold.js";

const USAGE = [
  "Usage: nestkit new [directory]",
  "[--pm npm|pnpm|yarn|bun]",
  "[--preset base|custom]",
  "[--code-quality biome|eslint|oxlint|none]",
  "[--unit-tests jest|vitest|mocha|none]",
  "[--git|--skip-git]",
  "[--skip-install]",
].join(" ");

function fail(message: string): never {
  p.cancel(message);
  process.exit(1);
}

function ensure<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) fail("Cancelled.");
  return value as Exclude<T, symbol>;
}

function oneOf<T extends string>(
  flag: string,
  value: string,
  valid: readonly T[]
): T {
  const match = valid.find((v) => v === value);
  if (!match) fail(`Invalid --${flag} "${value}". Use: ${valid.join(", ")}`);
  return match;
}

async function decide(
  yes: boolean | undefined,
  skip: boolean | undefined,
  message: string
): Promise<boolean> {
  if (skip) return false;
  if (yes || !process.stdin.isTTY) return true;
  return ensure(await p.confirm({ message, initialValue: true }));
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    pm: { type: "string" },
    preset: { type: "string" },
    "code-quality": { type: "string" },
    "unit-tests": { type: "string" },
    e2e: { type: "string" },
    "e2e-runner": { type: "string" },
    git: { type: "boolean" },
    "skip-git": { type: "boolean" },
    "skip-install": { type: "boolean" },
  },
});

const [command, dirArg] = positionals;
if (command !== "new" && command !== "create") {
  console.error(USAGE);
  process.exit(1);
}

p.intro("nestkit");

const installed = await detectInstalled();
if (installed.length === 0) fail("No supported package manager found.");

let pm: PackageManager;
if (values.pm) {
  const requested = installed.find((name) => name === values.pm);
  if (!requested) {
    fail(`"${values.pm}" is not installed. Available: ${installed.join(", ")}`);
  }
  pm = requested;
} else if (installed.length === 1) {
  pm = installed[0];
} else {
  const invoked = invokedBy();
  pm = ensure(
    await p.select({
      message: "Package manager",
      options: installed.map((value) => ({ value, label: value })),
      initialValue:
        invoked && installed.includes(invoked) ? invoked : installed[0],
    })
  );
}

const dir =
  dirArg ??
  ensure(
    await p.text({
      message: "Project name",
      placeholder: "my-app",
      validate: (v) => (v?.trim() ? undefined : "Required"),
    })
  );

const target = path.resolve(dir.trim());
if (existsSync(target) && readdirSync(target).length > 0) {
  fail(`${target} is not empty.`);
}

let preset: Preset;
if (values.preset) preset = oneOf("preset", values.preset, PRESETS);
else if (values["code-quality"] || values["unit-tests"] || values.e2e)
  preset = "custom";
else if (!process.stdin.isTTY) preset = "base";
else {
  preset = ensure(
    await p.select<Preset>({
      message: "Preset",
      options: [
        { value: "base", label: "Base", hint: "plain NestJS, no extras" },
        { value: "custom", label: "Custom", hint: "choose your tools" },
      ],
    })
  );
}

let codeQuality: CodeQuality = "none";
if (values["code-quality"]) {
  codeQuality = oneOf("code-quality", values["code-quality"], CODE_QUALITY);
} else if (preset === "custom" && process.stdin.isTTY) {
  codeQuality = ensure(
    await p.select<CodeQuality>({
      message: "Linting and formatting",
      options: [
        { value: "biome", label: "Biome", hint: "lint + format" },
        { value: "eslint", label: "ESLint + Prettier" },
        { value: "oxlint", label: "Oxlint + Prettier" },
        { value: "none", label: "None" },
      ],
    })
  );
}

let unitTests: UnitTests = "none";
if (values["unit-tests"]) {
  unitTests = oneOf("unit-tests", values["unit-tests"], UNIT_TESTS);
} else if (preset === "custom" && process.stdin.isTTY) {
  unitTests = ensure(
    await p.select<UnitTests>({
      message: "Unit tests",
      options: [
        { value: "jest", label: "Jest" },
        { value: "vitest", label: "Vitest" },
        { value: "mocha", label: "Mocha" },
        { value: "none", label: "None" },
      ],
    })
  );
}

let e2e: E2e = "none";
if (values.e2e) {
  e2e = oneOf("e2e", values.e2e, E2E);
} else if (preset === "custom" && process.stdin.isTTY) {
  e2e = ensure(
    await p.select<E2e>({
      message: "End-to-end tests",
      options: [
        { value: "supertest", label: "Supertest", hint: "HTTP, no browser" },
        { value: "playwright", label: "Playwright" },
        { value: "cypress", label: "Cypress" },
        { value: "selenium", label: "Selenium" },
        { value: "none", label: "None" },
      ],
    })
  );
}

let e2eRunner: Runner | undefined;
if (needsRunner(e2e)) {
  const flag = values["e2e-runner"]
    ? oneOf("e2e-runner", values["e2e-runner"], RUNNERS)
    : undefined;
  if (unitTests !== "none") {
    if (flag && flag !== unitTests) {
      fail(`--e2e-runner ${flag} conflicts with --unit-tests ${unitTests}.`);
    }
    p.log.info(`Using ${unitTests} for e2e tests.`);
  } else if (flag) {
    e2eRunner = flag;
  } else if (process.stdin.isTTY) {
    e2eRunner = ensure(
      await p.select<Runner>({
        message: "Test runner for e2e tests",
        options: [
          { value: "jest", label: "Jest" },
          { value: "vitest", label: "Vitest" },
          { value: "mocha", label: "Mocha" },
        ],
      })
    );
  } else {
    fail(`${e2e} needs a test runner. Pass --e2e-runner ${RUNNERS.join("|")}.`);
  }
}

const hasGit = gitInstalled();
if (!hasGit && !values["skip-git"]) {
  p.log.warn("git not found, skipping repository setup.");
}

const useGit =
  hasGit &&
  !insideGitRepo(target) &&
  (await decide(
    values.git,
    values["skip-git"],
    "Initialize a git repository?"
  ));
const useInstall = !values["skip-install"];

const projectName = path.basename(target).toLowerCase().replace(/\s+/g, "-");
copyBase(target, projectName);
for (const overlay of overlaysFor({ codeQuality, unitTests, e2e, e2eRunner })) {
  applyOverlay(overlay, target);
}

if (useInstall) {
  p.log.step(`Installing dependencies with ${pm}`);
  if (!install(pm, target))
    p.log.warn(`${pm} install failed, run it manually.`);
}

if (useGit && !initGit(target)) {
  p.log.warn("Could not initialize a git repository.");
}

const relative = path.relative(process.cwd(), target);
const steps = [
  relative && `cd ${relative}`,
  !useInstall && `${pm} install`,
  `${pm} run start:dev`,
].filter(Boolean);
p.outro(`Done. Next:\n  ${steps.join("\n  ")}`);
