#!/usr/bin/env node
import * as p from "@clack/prompts";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  CODE_QUALITY,
  CODE_QUALITY_OVERLAYS,
  PRESETS,
  type CodeQuality,
  type Preset,
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

const USAGE =
  "Usage: nestkit new [directory] [--pm npm|pnpm|yarn|bun] [--preset base|custom] [--code-quality biome|eslint|oxlint|none] [--git|--skip-git] [--skip-install]";

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
else if (values["code-quality"]) preset = "custom";
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
for (const overlay of CODE_QUALITY_OVERLAYS[codeQuality]) {
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
