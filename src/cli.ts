#!/usr/bin/env node
import * as p from "@clack/prompts";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  CODE_QUALITY,
  E2E,
  ENV,
  MODULE_SYSTEMS,
  PRESETS,
  RUNNERS,
  RUNNER_TYPES,
  UNIT_TESTS,
  needsRunner,
  overlaysFor,
  recommendedRunner,
  runnersFor,
  type CodeQuality,
  type E2e,
  type Env,
  type ModuleSystem,
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
  addTsconfigTypes,
  applyOverlay,
  copyBase,
  gitInstalled,
  initGit,
  insideGitRepo,
  install,
  retargetNest,
  rewriteRelativeImports,
} from "./scaffold.js";
import { resolveNest } from "./versions.js";

const USAGE = [
  "Usage: nestkit new [directory]",
  "[--pm npm|pnpm|yarn|bun]",
  "[--nest-version latest|previous|11|12]",
  "[--module-system cjs|esm]",
  "[--preset base|custom]",
  "[--code-quality biome|eslint|oxlint|none]",
  "[--unit-tests jest|vitest|mocha|none]",
  "[--e2e supertest|playwright|cypress|selenium|none]",
  "[--e2e-runner jest|vitest|mocha]",
  "[--env joi|class-validator|zod|vanilla|none]",
  "[--git|--skip-git]",
  "[--skip-install]",
].join(" ");

const RUNNER_LABELS: Record<Runner, string> = {
  jest: "Jest",
  vitest: "Vitest",
  mocha: "Mocha",
};

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

// Skip flag wins, then the yes flag, then the default when there is no TTY, then ask
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
    "nest-version": { type: "string" },
    "module-system": { type: "string" },
    preset: { type: "string" },
    "code-quality": { type: "string" },
    "unit-tests": { type: "string" },
    e2e: { type: "string" },
    "e2e-runner": { type: "string" },
    env: { type: "string" },
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

const nestSpec = values["nest-version"] ?? "latest";
const nest = resolveNest(nestSpec);
if (!nest)
  fail(
    `Unsupported --nest-version "${nestSpec}". Use: latest, previous, 11, 12`
  );
p.log.info(`NestJS ${nest}${values["nest-version"] ? "" : " (latest)"}`);

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
else if (
  values["code-quality"] ||
  values["unit-tests"] ||
  values.e2e ||
  values.env
) {
  preset = "custom";
} else if (!process.stdin.isTTY) preset = "base";
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

let moduleSystem: ModuleSystem = "cjs";
if (values["module-system"]) {
  moduleSystem = oneOf(
    "module-system",
    values["module-system"],
    MODULE_SYSTEMS
  );
} else if (process.stdin.isTTY) {
  moduleSystem = ensure(
    await p.select<ModuleSystem>({
      message: "Module system",
      options: [
        { value: "cjs", label: "CommonJS" },
        {
          value: "esm",
          label: "ESM",
          hint:
            nest === "11" ? "not officially supported by Nest 11" : undefined,
        },
      ],
    })
  );
}

// Runners that work for this Nest version and module system
const recommended = recommendedRunner(nest, moduleSystem);
const runnerOptions = runnersFor(nest, moduleSystem).map((value) => ({
  value,
  label: RUNNER_LABELS[value],
  hint: value === recommended ? "recommended" : undefined,
}));
const isAvailable = (runner: Runner) =>
  runnerOptions.some((o) => o.value === runner);

const MODULE_LABELS: Record<ModuleSystem, string> = {
  cjs: "CommonJS",
  esm: "ESM",
};

// Runners not offered for this Nest version with the given module system
const missingFor = (system: ModuleSystem) =>
  RUNNERS.filter((r) => !runnersFor(nest, system).includes(r));

// e.g. "Jest is not available for Nest 11 with ESM". Undefined when everything is offered.
const runnerNote = (): string | undefined => {
  const missing = missingFor(moduleSystem);
  if (missing.length === 0) return undefined;
  const names = new Intl.ListFormat("en").format(
    missing.map((r) => RUNNER_LABELS[r])
  );
  // Name the module system only when it changes what is offered
  const sameForBoth = missingFor("cjs").join() === missingFor("esm").join();
  const where = sameForBoth
    ? `Nest ${nest}`
    : `Nest ${nest} with ${MODULE_LABELS[moduleSystem]}`;
  return `${names} ${missing.length === 1 ? "is" : "are"} not available for ${where}`;
};

// Puts the note in brackets after a runner prompt's title
const withNote = (message: string) => {
  const note = runnerNote();
  return note ? `${message} (${note})` : message;
};

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
  if (unitTests !== "none" && !isAvailable(unitTests)) {
    fail(
      `${unitTests} is not available for Nest ${nest} with ${moduleSystem}.`
    );
  }
} else if (preset === "custom" && process.stdin.isTTY) {
  unitTests = ensure(
    await p.select<UnitTests>({
      message: withNote("Unit tests"),
      options: [...runnerOptions, { value: "none", label: "None" }],
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

// Supertest and selenium need a runner: reuse the unit-test one, else ask
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
    if (!isAvailable(flag)) {
      fail(`${flag} is not available for Nest ${nest} with ${moduleSystem}.`);
    }
    e2eRunner = flag;
  } else if (process.stdin.isTTY) {
    e2eRunner = ensure(
      await p.select<Runner>({
        message: withNote("Test runner for e2e tests"),
        options: runnerOptions,
      })
    );
  } else {
    fail(`${e2e} needs a test runner. Pass --e2e-runner ${RUNNERS.join("|")}.`);
  }
}

let env: Env = "none";
if (values.env) {
  env = oneOf("env", values.env, ENV);
} else if (preset === "custom" && process.stdin.isTTY) {
  const wantsEnv = ensure(
    await p.confirm({
      message: "Add environment config with validation?",
      initialValue: true,
    })
  );
  if (wantsEnv) {
    env = ensure(
      await p.select<Env>({
        message: "Validation library",
        options: [
          { value: "joi", label: "Joi" },
          {
            value: "class-validator",
            label: "class-validator",
            hint: "with class-transformer",
          },
          { value: "zod", label: "Zod" },
          {
            value: "vanilla",
            label: "None",
            hint: "plain TypeScript, no library",
          },
        ],
      })
    );
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
for (const overlay of overlaysFor({
  nest,
  moduleSystem,
  codeQuality,
  unitTests,
  e2e,
  e2eRunner,
  env,
})) {
  applyOverlay(overlay, target);
}
const runner = unitTests !== "none" ? unitTests : e2eRunner;
if (runner) addTsconfigTypes(target, RUNNER_TYPES[runner]);
retargetNest(target, nest);
if (moduleSystem === "esm") rewriteRelativeImports(target);

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
