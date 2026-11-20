#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";
import {
  detectInstalled,
  invokedBy,
  type PackageManager,
} from "./package-managers.js";
import {
  copyBase,
  initGit,
  insideGitRepo,
  install,
  gitInstalled,
} from "./scaffold.js";

const USAGE =
  "Usage: nestkit new [directory] [--pm npm|pnpm|yarn|bun] [--git|--skip-git] [--skip-install]";

function fail(message: string): never {
  p.cancel(message);
  process.exit(1);
}

function ensure<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) fail("Cancelled.");
  return value as Exclude<T, symbol>;
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
